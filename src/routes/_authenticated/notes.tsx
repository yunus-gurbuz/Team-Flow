import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Globe, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/orgs";
import { EmptyWorkspace, PageHeader } from "@/components/app-shell";
import { Attachments } from "@/components/attachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Notes — TeamFlow" },
      { name: "description", content: "Write shared team notes and publish public read-only links." },
      { property: "og:title", content: "Notes — TeamFlow" },
      {
        property: "og:description",
        content: "Write shared team notes and publish public read-only links.",
      },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { org } = useOrg();
  const queryClient = useQueryClient();
  const orgId = org?.id;
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, is_public, share_token, updated_at")
        .eq("org_id", orgId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = notes.find((n) => n.id === selected) ?? notes[0] ?? null;

  useEffect(() => {
    if (active) {
      setTitle(active.title);
      setContent(active.content);
    }
  }, [active?.id]);

  const createNote = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("notes")
        .insert({ org_id: orgId!, created_by: userData.user!.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setSelected(id);
      queryClient.invalidateQueries({ queryKey: ["notes", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNote = useMutation({
    mutationFn: async (patch: { title?: string; content?: string; is_public?: boolean }) => {
      const { error } = await supabase.from("notes").update(patch).eq("id", active!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", orgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notes").delete().eq("id", active!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["notes", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!org) return <EmptyWorkspace />;

  const shareUrl = active ? `${typeof window !== "undefined" ? window.location.origin : ""}/note/${active.share_token}` : "";

  return (
    <div>
      <PageHeader title="Notes" description={`${org.name} · ${notes.length} notes`}>
        <Button onClick={() => createNote.mutate()}>
          <Plus className="size-4" /> New note
        </Button>
      </PageHeader>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[260px_1fr]">
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setSelected(n.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  active?.id === n.id && "bg-accent font-medium",
                )}
              >
                <span className="block truncate">{n.title}</span>
                {n.is_public ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="size-3" /> shared
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          {notes.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No notes yet
            </li>
          ) : null}
        </ul>

        {active ? (
          <div className="space-y-4">
            <div className="panel space-y-4 p-6">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title !== active.title && saveNote.mutate({ title })}
                className="border-0 px-0 text-xl font-bold shadow-none focus-visible:ring-0"
              />
              <Textarea
                rows={14}
                value={content}
                placeholder="Start writing…"
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => content !== active.content && saveNote.mutate({ content })}
              />
            </div>

            <div className="panel space-y-3 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share">Public share link</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can read this note without signing in.
                  </p>
                </div>
                <Switch
                  id="share"
                  checked={active.is_public}
                  onCheckedChange={(v) => saveNote.mutate({ is_public: v })}
                />
              </div>
              {active.is_public ? (
                <div className="flex gap-2">
                  <Input readOnly value={shareUrl} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success("Share link copied.");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="panel p-6">
              <Attachments orgId={org.id} noteId={active.id} />
            </div>

            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => deleteNote.mutate()}
            >
              <Trash2 className="size-4" /> Delete note
            </Button>
          </div>
        ) : (
          <div className="panel flex items-center justify-center p-12 text-sm text-muted-foreground">
            Select or create a note to start writing.
          </div>
        )}
      </div>
    </div>
  );
}
