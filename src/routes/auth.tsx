import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Search = { next?: string | undefined; mode?: "signup" | undefined };

function safePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: safePath(search["next"]),
    mode: search["mode"] === "signup" ? "signup" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TeamFlow" },
      { name: "description", content: "Sign in or create your TeamFlow account." },
      { property: "og:title", content: "Sign in — TeamFlow" },
      { property: "og:description", content: "Sign in or create your TeamFlow account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next, mode } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);

  const destination = next ?? "/tasks";

  const goNext = () => {
    window.location.assign(destination);
  };

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    goNext();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${destination}`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSentConfirm(true);
      return;
    }
    goNext();
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    goNext();
  }

  async function handleReset() {
    if (!email) {
      toast.error("Enter your email first, then click reset.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent. Check your inbox.");
  }

  if (sentConfirm) {
    return (
      <Centered>
        <h1 className="text-2xl font-bold">Confirm your email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Click it to
          activate your TeamFlow account.
        </p>
        <Button className="mt-6 w-full" variant="outline" onClick={() => setSentConfirm(false)}>
          Back to sign in
        </Button>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="mb-6 text-center">
        <Link to="/" className="text-lg font-bold tracking-tight">
          TeamFlow
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">Your team workspace</p>
      </div>

      <Tabs defaultValue={mode === "signup" ? "signup" : "signin"}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form className="space-y-4 pt-4" onSubmit={handleSignIn}>
            <Field label="Email" id="email">
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" id="password">
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button className="w-full" type="submit" disabled={busy}>
              Sign in
            </Button>
            <button
              type="button"
              onClick={handleReset}
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot your password?
            </button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form className="space-y-4 pt-4" onSubmit={handleSignUp}>
            <Field label="Full name" id="name">
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Email" id="signup-email">
              <Input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" id="signup-password">
              <Input
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button className="w-full" type="submit" disabled={busy}>
              Create account
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" className="w-full" onClick={handleGoogle}>
        Continue with Google
      </Button>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/">Back to home</Link>
      </p>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="panel w-full max-w-sm p-8">{children}</div>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
