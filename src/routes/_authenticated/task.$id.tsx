import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/orgs";
import { Attachments } from "@/components/attachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notifyAssignment } from "@/lib/notifications.functions";
import type { Database } from "@/integrations/supabase/types";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export const Route = createFileRoute("/_authenticated/task/$id")({
  head: () => ({
    meta: [
      { title: "Task — TeamFlow" },
      { name: "description", content: "Task details, comments and attached files." },
      { property: "og:title", content: "Task — TeamFlow" },
      { property: "og:description", content: "Task details, comments and attached files." },
    ],
  }),
  component: TaskDetail,
});

const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function TaskDetail() {
  const { id } = Route.useParams();
  const { org } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", task?.org_id],
    enabled: Boolean(task?.org_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_members")
        .select("user_id, profiles:user_id(full_name, email)")
        .eq("org_id", task!.org_id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("id, body, created_at, user_id, profiles:user_id(full_name)")
        .eq("task_id", id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
    }
  }, [task]);

  const update = useMutation({
    mutationFn: async (patch: TaskUpdate) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("task_comments").insert({
        task_id: id,
        org_id: task!.org_id,
        user_id: userData.user!.id,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleAssign(value: string) {
    const assigneeId = value === "none" ? null : value;
    await update.mutateAsync({ assignee_id: assigneeId });
    if (assigneeId) {
      try {
        const result = await notifyAssignment({ data: { taskId: id, assigneeId } });
        toast.success(result.emailed ? "Assigned and notified by email." : "Assignee updated.");
      } catch {
        toast.success("Assignee updated.");
      }
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/tasks" });
  }

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading task…</p>;
  if (!task) return <p className="p-8 text-sm text-muted-foreground">This task no longer exists.</p>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link to="/tasks" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to tasks
      </Link>

      <div className="grid gap-6 md:grid-cols-[1fr_240px]">
        <div className="space-y-6">
          <div className="panel space-y-4 p-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && update.mutate({ title })}
              className="border-0 px-0 text-xl font-bold shadow-none focus-visible:ring-0"
            />
            <Textarea
              value={description}
              placeholder="Add a description…"
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() =>
                description !== (task.description ?? "") && update.mutate({ description })
              }
            />
          </div>

          <div className="panel space-y-4 p-6">
            <h2 className="text-sm font-semibold">Comments</h2>
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-muted/60 p-3">
                  <p className="text-xs font-medium">{c.profiles?.full_name ?? "Teammate"}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </li>
              ))}
              {comments.length === 0 ? (
                <li className="text-sm text-muted-foreground">No comments yet.</li>
              ) : null}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (comment.trim()) addComment.mutate(comment.trim());
              }}
            >
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment…"
              />
              <Button type="submit">Post</Button>
            </form>
          </div>

          <div className="panel p-6">
            <Attachments orgId={task.org_id} taskId={task.id} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel space-y-4 p-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={task.status} onValueChange={(v) => update.mutate({ status: v as TaskUpdate["status"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={task.assignee_id ?? "none"} onValueChange={handleAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name ?? m.profiles?.email ?? "Teammate"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                value={task.due_date ?? ""}
                onChange={(e) => update.mutate({ due_date: e.target.value || null })}
              />
            </div>
          </div>

          <Button variant="outline" className="w-full text-destructive" onClick={handleDelete}>
            <Trash2 className="size-4" /> Delete task
          </Button>
          {org ? <p className="text-center text-xs text-muted-foreground">{org.name}</p> : null}
        </aside>
      </div>
    </div>
  );
}
