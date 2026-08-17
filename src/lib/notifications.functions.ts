import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ taskId: z.string().uuid(), assigneeId: z.string().uuid() });

/**
 * Notifies a teammate that a task was assigned to them.
 * Email delivery activates once a verified sender domain is configured for the
 * project; until then the assignment is recorded and this reports emailed:false.
 */
export const notifyAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: task } = await context.supabase
      .from("tasks")
      .select("id, title, org_id")
      .eq("id", data.taskId)
      .maybeSingle();
    if (!task) throw new Error("Task not found");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", data.assigneeId)
      .maybeSingle();
    if (!profile) return { emailed: false as const, reason: "no_profile" };

    console.info(
      `[TeamFlow] Task "${task.title}" assigned to ${profile.email}. Email delivery pending sender-domain setup.`,
    );

    return { emailed: false as const, reason: "email_domain_not_configured" };
  });
