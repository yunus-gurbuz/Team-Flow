import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublicNote } from "@/lib/public-notes.functions";

export const Route = createFileRoute("/note/$token")({
  loader: async ({ params }) => {
    let note: { title: string; content: string } | null = null;
    try {
      note = await getPublicNote({ data: { token: params.token } });
    } catch {
      throw notFound();
    }
    if (!note) throw notFound();
    return { note };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Note unavailable — TeamFlow" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.note.title} — shared on TeamFlow`;
    const description = loaderData.note.content.slice(0, 150) || "A note shared from TeamFlow.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  errorComponent: () => <Fallback message="This note could not be loaded." />,
  notFoundComponent: () => <Fallback message="This note is not shared or the link is invalid." />,
  component: PublicNote,
});

function Fallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-xl font-bold">Note unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Go to TeamFlow
        </Link>
      </div>
    </div>
  );
}

function PublicNote() {
  const { note } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <Link to="/" className="text-sm font-bold tracking-tight">
          TeamFlow
        </Link>
      </header>
      <article className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Shared note
        </p>
        <h1 className="mt-3 text-3xl font-extrabold">{note.title}</h1>
        <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed">{note.content}</div>
      </article>
    </div>
  );
}
