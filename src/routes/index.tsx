import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Paperclip, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TeamFlow — One workspace for team tasks, notes and files" },
      {
        name: "description",
        content:
          "TeamFlow gives every team a shared workspace: task boards with assignees and comments, shareable notes, and organization file storage.",
      },
      { property: "og:title", content: "TeamFlow — One workspace for team tasks and notes" },
      {
        property: "og:description",
        content: "Task boards, shareable notes and org file storage for small teams.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CheckCircle2,
    title: "Task boards",
    body: "Lists, statuses, assignees, due dates and threaded comments on every task.",
  },
  {
    icon: FileText,
    title: "Notes worth sharing",
    body: "Write notes with your team, then publish a read-only public link in one click.",
  },
  {
    icon: Paperclip,
    title: "Files in context",
    body: "Attach documents to any task or note. Everything stays inside your organization.",
  },
  {
    icon: Users,
    title: "Roles and invites",
    body: "Admins manage the workspace and invite teammates by email. Members just get work done.",
  },
];

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            TF
          </div>
          <span className="text-lg font-bold tracking-tight">TeamFlow</span>
        </div>
        <nav className="flex items-center gap-2">
          {loading ? null : user ? (
            <Button asChild>
              <Link to="/tasks">Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:pt-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Team workspace
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Every task, note and file your team needs — in one calm place.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            TeamFlow keeps organizations organized. Create workspaces, assign work, share notes
            publicly when you want to, and keep the rest private.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your workspace
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        TeamFlow — built for teams that like tidy workspaces.
      </footer>
    </div>
  );
}
