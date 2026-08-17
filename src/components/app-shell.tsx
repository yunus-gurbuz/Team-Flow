import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, LogOut, Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/orgs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/tasks", label: "Tasks" },
  { to: "/notes", label: "Notes" },
] as const;

export function AppShell({ email, children }: { email: string; children: ReactNode }) {
  const { orgs, org, setOrgId, isAdmin, refresh } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function createOrg() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: trimmed, created_by: uid })
      .select("id")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not create workspace.");
      return;
    }
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({ org_id: data.id, user_id: uid, role: "admin" });
    if (memberError) {
      toast.error(memberError.message);
      return;
    }
    setName("");
    setCreating(false);
    refresh();
    setOrgId(data.id);
    toast.success(`${trimmed} is ready.`);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            TF
          </div>
          <span className="font-bold tracking-tight">TeamFlow</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-lg bg-sidebar-accent px-3 py-2.5 text-left text-sm font-medium text-sidebar-accent-foreground transition-colors hover:opacity-90">
              <span className="truncate">{org?.name ?? "No workspace"}</span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
            {orgs.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => setOrgId(o.id)}>
                <span className="flex-1 truncate">{o.name}</span>
                {o.id === org?.id ? <Check className="size-4" /> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCreating(true); }}>
              <Plus className="size-4" /> New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav className="mt-6 space-y-1">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                pathname.startsWith(tab.to) && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                pathname.startsWith("/admin") && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Shield className="size-4" /> Admin
            </Link>
          ) : null}
        </nav>

        <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
          <p className="truncate px-3 text-xs text-sidebar-foreground/70">{email}</p>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1 border-b border-border bg-card px-4 py-2 md:hidden">
          {tabs.map((tab) => (
            <Link key={tab.to} to={tab.to} className="rounded-md px-3 py-1.5 text-sm font-medium">
              {tab.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link to="/admin" className="rounded-md px-3 py-1.5 text-sm font-medium">
              Admin
            </Link>
          ) : null}
          <button onClick={handleSignOut} className="ml-auto text-sm text-muted-foreground">
            Sign out
          </button>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="org-name">Workspace name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <DialogFooter>
            <Button onClick={createOrg}>Create workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function EmptyWorkspace() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-xl font-bold">No workspace yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a workspace from the switcher in the sidebar, or ask a teammate for an invite
          link.
        </p>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-card px-6 py-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export { DialogTrigger };
