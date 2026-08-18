import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/orgs";
import { EmptyWorkspace, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — TeamFlow" },
      { name: "description", content: "Track your team's tasks by list, status and assignee." },
      { property: "og:title", content: "Tasks — TeamFlow" },
      { property: "og:description", content: "Track your team's tasks by list, status and assignee." },
    ],
  }),
  component: TasksPage,
});

const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

function TasksPage() {
  const { org } = useOrg();
  const queryClient = useQueryClient();
  const [listName, setListName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [activeList, setActiveList] = useState<string | null>(null);

  const orgId = org?.id;

  const { data: lists = [] } = useQuery({
    queryKey: ["lists", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_lists")
        .select("id, name")
        .eq("org_id", orgId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, list_id, due_date, assignee_id, profiles:assignee_id(full_name)")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addList = useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("task_lists")
        .insert({ org_id: orgId!, name, created_by: userData.user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setListName("");
      queryClient.invalidateQueries({ queryKey: ["lists", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTask = useMutation({
    mutationFn: async (title: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("tasks").insert({
        org_id: orgId!,
        title,
        list_id: activeList,
        created_by: userData.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTaskTitle("");
      queryClient.invalidateQueries({ queryKey: ["tasks", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!org) return <EmptyWorkspace />;

  const visible = activeList ? tasks.filter((t) => t.list_id === activeList) : tasks;

  return (
    <div>
      <PageHeader title="Tasks" description={`${org.name} · ${tasks.length} tasks`}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (taskTitle.trim()) addTask.mutate(taskTitle.trim());
          }}
        >
          <Input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="New task title"
            className="w-56"
          />
          <Button type="submit">
            <Plus className="size-4" /> Add task
          </Button>
        </form>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 px-6 py-4">
        <Button
          size="sm"
          variant={activeList === null ? "default" : "outline"}
          onClick={() => setActiveList(null)}
        >
          All lists
        </Button>
        {lists.map((l) =>
          editingList === l.id ? (
            <form
              key={l.id}
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const name = editingName.trim();
                if (name && name !== l.name) renameList.mutate({ id: l.id, name });
                else setEditingList(null);
              }}
            >
              <Input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => setEditingList(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingList(null);
                }}
                className="h-8 w-32"
              />
              <Button size="sm" variant="ghost" type="submit" onMouseDown={(e) => e.preventDefault()}>
                <Check className="size-4" />
              </Button>
            </form>
          ) : (
            <div key={l.id} className="group relative">
              <Button
                size="sm"
                variant={activeList === l.id ? "default" : "outline"}
                onClick={() => setActiveList(l.id)}
                onDoubleClick={() => {
                  setEditingList(l.id);
                  setEditingName(l.name);
                }}
                className="pr-8"
              >
                {l.name}
              </Button>
              <button
                type="button"
                aria-label={`Rename ${l.name}`}
                onClick={() => {
                  setEditingList(l.id);
                  setEditingName(l.name);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-60 hover:opacity-100"
              >
                <Pencil className="size-3" />
              </button>
            </div>
          ),
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (listName.trim()) addList.mutate(listName.trim());
          }}
        >
          <Input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="New list"
            className="h-8 w-32"
          />
          <Button size="sm" variant="ghost" type="submit">
            <Plus className="size-4" />
          </Button>
        </form>
      </div>

      <div className="grid gap-4 px-6 pb-10 lg:grid-cols-3">
        {STATUSES.map((status) => {
          const columnTasks = visible.filter((t) => t.status === status.value);
          return (
            <section key={status.value} className="panel p-4">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{status.label}</h2>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </header>
              <ul className="space-y-2">
                {columnTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      to="/task/$id"
                      params={{ id: task.id }}
                      className="block rounded-lg border border-border p-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
                    >
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.profiles?.full_name ?? "Unassigned"}</span>
                        {task.due_date ? <span>· due {task.due_date}</span> : null}
                      </div>
                    </Link>
                  </li>
                ))}
                {columnTasks.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Nothing here
                  </li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
