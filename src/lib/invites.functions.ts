import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({ token: z.string().min(8).max(200) });

/** Public: shows which workspace an invite link belongs to (no member data). */
export const getInvitePreview = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("id, email, role, expires_at, accepted_at, organizations(name)")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) return { status: "invalid" as const };
    if (invite.accepted_at) return { status: "used" as const };
    if (new Date(invite.expires_at) < new Date()) return { status: "expired" as const };
    return {
      status: "ok" as const,
      email: invite.email,
      role: invite.role,
      orgName: invite.organizations?.name ?? "Workspace",
    };
  });

/** Signed-in: joins the invited organization. */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("id, org_id, role, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite) throw new Error("This invite link is not valid.");
    if (invite.accepted_at) throw new Error("This invite has already been used.");
    if (new Date(invite.expires_at) < new Date()) throw new Error("This invite has expired.");

    const { error: memberError } = await supabaseAdmin
      .from("org_members")
      .upsert(
        { org_id: invite.org_id, user_id: context.userId, role: invite.role },
        { onConflict: "org_id,user_id" },
      );
    if (memberError) throw new Error(memberError.message);

    await supabaseAdmin
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { orgId: invite.org_id };
  });
