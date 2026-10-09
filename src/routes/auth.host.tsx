import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/host")({
  head: () => ({
    meta: [{ title: "Host sign in — EVENT-HUB" }],
  }),
  component: HostAuth,
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});

function HostAuth() {
  return (
    <AuthShell subtitle="For event organizers">
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="mt-6">
          <AuthForm mode="signin" role="host" />
        </TabsContent>
        <TabsContent value="signup" className="mt-6">
          <AuthForm mode="signup" role="host" />
        </TabsContent>
      </Tabs>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Want to create a new event?{" "}
        <Link to="/events/create" className="text-foreground underline">
          Start here
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-hero" />
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
        <div className="mb-6 flex items-center gap-2">
            <div className="flex items-center h-8">
              <img src="/favicon.png" alt="EVENT-HUB Logo" className="h-full w-auto object-contain" />
            </div>
          <div>
            <div className="text-sm font-semibold">EVENT-HUB</div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {subtitle}
            </div>
          </div>
        </div>
        <Card className="border-border/60 bg-card/80 p-6 shadow-card backdrop-blur">
          {children}
        </Card>
      </div>
    </div>
  );
}

export function AuthForm({
  mode,
  role,
}: {
  mode: "signin" | "signup";
  role: "host" | "judge";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState("");
  const navigate = useNavigate();

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 15 * 60 * 1000;

  const checkRateLimit = () => {
    if (mode === "signup") return true;
    const lockTime = localStorage.getItem("event_host_lock_time");
    if (lockTime) {
      if (Date.now() < parseInt(lockTime)) {
        const remainingMins = Math.ceil((parseInt(lockTime) - Date.now()) / 60000);
        setRateLimitError(`Too many failed attempts. Try again in ${remainingMins} minutes.`);
        return false;
      } else {
        localStorage.removeItem("event_host_lock_time");
        localStorage.removeItem("event_host_attempts");
        setRateLimitError("");
      }
    }
    return true;
  };

  const recordFailedAttempt = () => {
    if (mode === "signup") return;
    let attempts = parseInt(localStorage.getItem("event_host_attempts") || "0");
    attempts++;
    localStorage.setItem("event_host_attempts", attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem("event_host_lock_time", (Date.now() + LOCKOUT_TIME).toString());
      checkRateLimit();
    }
  };

  const resetAttempts = () => {
    localStorage.removeItem("event_host_attempts");
    localStorage.removeItem("event_host_lock_time");
    setRateLimitError("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkRateLimit()) return;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user) {
          // Assign role
          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role,
          } as never);
        }
        toast.success("Account created");
        navigate({ to: role === "host" ? "/dashboard/host" : "/dashboard/judge" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in");
        resetAttempts();
        navigate({ to: role === "host" ? "/dashboard/host" : "/dashboard/judge" });
      }
    } catch (err) {
      recordFailedAttempt();
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {rateLimitError && (
        <div className="bg-destructive/15 text-destructive border border-destructive/50 text-sm p-3 rounded-md font-medium">
          {rateLimitError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === "signin" && (
            <Link
              to="/auth/forgot"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="At least 6 characters"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !!rateLimitError}>
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
