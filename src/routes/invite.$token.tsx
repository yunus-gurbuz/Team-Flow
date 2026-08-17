import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getInvitePreview, acceptInvite } from "@/lib/invites.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join a workspace — TeamFlow" },
      { name: "description", content: "Accept your TeamFlow workspace invitation." },
      { property: "og:title", content: "Join a workspace — TeamFlow" },
      { property: "og:description", content: "Accept your TeamFlow workspace invitation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => getInvitePreview({ data: { token } }),
  });

  async function join() {
    setJoining(true);
    try {
      const { orgId } = await acceptInvite({ data: { token } });
      window.localStorage.setItem("teamflow.org", orgId);
      toast.success("You're in!");
      navigate({ to: "/tasks" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept this invite.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-sm p-8 text-center">
        <Link to="/" className="text-lg font-bold tracking-tight">
          TeamFlow
        </Link>

        {isLoading || loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Checking your invite…</p>
        ) : !invite || invite.status !== "ok" ? (
          <>
            <h1 className="mt-6 text-xl font-bold">Invite unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invite?.status === "used"
                ? "This invite has already been used."
                : invite?.status === "expired"
                  ? "This invite link has expired. Ask an admin for a new one."
                  : "This invite link is not valid."}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-bold">Join {invite.orgName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You were invited as {invite.role} ({invite.email}).
            </p>
            {user ? (
              <Button className="mt-6 w-full" onClick={join} disabled={joining}>
                {joining ? "Joining…" : `Join ${invite.orgName}`}
              </Button>
            ) : (
              <Button asChild className="mt-6 w-full">
                <Link to="/auth" search={{ next: `/invite/${token}`, mode: "signup" }}>
                  Sign up to accept
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
