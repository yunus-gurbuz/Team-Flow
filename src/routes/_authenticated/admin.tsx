import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TeamFlow" },
      { name: "description", content: "Manage members, invites and workspace usage stats." },
      { property: "og:title", content: "Admin — TeamFlow" },
      { property: "og:description", content: "Manage members, invites and workspace usage stats." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { org, isAdmin } = useOrg();
  const queryClient = useQueryClient();
  const orgId = org?.id;
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const { data: members = [] } = useQuery({
    queryKey: ["admin-members", orgId],
    enabled: Boolean(orgId) && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_members")
        .select("id, role, user_id, created_at, profiles:user_id(full_name, email)")
        .eq("org_id", orgId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["admin-invites", orgId],
    enabled: Boolean(orgId) && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("id, email, role, token, accepted_at, expires_at")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["admin-tasks", orgId],
    enabled: Boolean(orgId) && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, created_at, profiles:assignee_id(full_name)")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats", orgId],
    enabled: Boolean(orgId) && isAdmin,
    queryFn: async () => {
      const [notes, attachments] = await Promise.all([
        supabase.from("notes").select("id, is_public").eq("org_id", orgId!),
        supabase.from("attachments").select("file_size").eq("org_id", orgId!),
      ]);
      const bytes = (attachments.data ?? []).reduce((sum, a) => sum + Number(a.file_size), 0);
      return {
        notes: notes.data?.length ?? 0,
        sharedNotes: (notes.data ?? []).filter((n) => n.is_public).length,
        files: attachments.data?.length ?? 0,
        storageMb: bytes / 1024 / 1024,
      };
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("invites")
        .insert({
          org_id: orgId!,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: userData.user!.id,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data.token;
    },
    onSuccess: (token) => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["admin-invites", orgId] });
      navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
      toast.success("Invite created — link copied to your clipboard.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "member" }) => {
      const { error } = await supabase.from("org_members").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-members", orgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("org_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-members", orgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-invites", orgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!org) return <EmptyWorkspace />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need the admin role in {org.name} to open this page.
          </p>
        </div>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== "done").length;

  return (
    <div>
      <PageHeader title="Admin" description={`Manage ${org.name}`} />

      <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Members" value={members.length} />
        <Stat label="Tasks" value={tasks.length} />
        <Stat label="Open tasks" value={openTasks} />
        <Stat label="Notes" value={`${stats?.notes ?? 0} (${stats?.sharedNotes ?? 0} shared)`} />
        <Stat
          label="Files"
          value={`${stats?.files ?? 0} · ${(stats?.storageMb ?? 0).toFixed(1)} MB`}
        />
      </div>

      <section className="px-6 pb-6">
        <div className="panel p-6">
          <h2 className="text-sm font-semibold">Invite a teammate</h2>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (inviteEmail.trim()) createInvite.mutate();
            }}
          >
            <Input
              type="email"
              required
              className="w-64"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Mail className="size-4" /> Create invite link
            </Button>
          </form>

          {invites.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{invite.email}</span>
                  <Badge variant="secondary">{invite.role}</Badge>
                  {invite.accepted_at ? (
                    <Badge>accepted</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      expires {new Date(invite.expires_at).toLocaleDateString()}
                    </span>
                  )}
                  <div className="ml-auto flex gap-2">
                    {!invite.accepted_at ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/invite/${invite.token}`,
                          );
                          toast.success("Invite link copied.");
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeInvite.mutate(invite.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="px-6 pb-6">
        <div className="panel p-6">
          <h2 className="mb-4 text-sm font-semibold">Members</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.profiles?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.profiles?.email}</TableCell>
                  <TableCell>
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        changeRole.mutate({ id: m.id, role: v as "admin" | "member" })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="panel p-6">
          <h2 className="mb-4 text-sm font-semibold">All tasks</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link to="/task/$id" params={{ id: t.id }} className="hover:underline">
                      {t.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.profiles?.full_name ?? "Unassigned"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
