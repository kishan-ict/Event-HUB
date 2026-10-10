import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthShell } from "./auth.host";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { PasswordStrengthBar } from "@/components/ui/password-strength";

const searchSchema = z.object({
  redirect: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/auth/participant")({
  head: () => ({ meta: [{ title: "Participant sign in — EVENT-HUB" }] }),
  validateSearch: zodValidator(searchSchema),
  component: ParticipantAuth,
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

function ParticipantAuth() {
  const { redirect } = useSearch({ from: "/auth/participant" });
  return (
    <AuthShell subtitle="For participants">
      <Tabs defaultValue="signup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="mt-6">
          <ParticipantForm mode="signin" redirectTo={redirect} />
        </TabsContent>
        <TabsContent value="signup" className="mt-6">
          <ParticipantForm mode="signup" redirectTo={redirect} />
        </TabsContent>
      </Tabs>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Hosting an event?{" "}
        <Link to="/auth/host" className="text-foreground underline">
          Host sign in
        </Link>
      </p>
    </AuthShell>
  );
}

function ParticipantForm({
  mode,
  redirectTo,
}: {
  mode: "signin" | "signup";
  redirectTo: string;
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
    const lockTime = localStorage.getItem("event_participant_lock_time");
    if (lockTime) {
      if (Date.now() < parseInt(lockTime)) {
        const remainingMins = Math.ceil((parseInt(lockTime) - Date.now()) / 60000);
        setRateLimitError(`Too many failed attempts. Try again in ${remainingMins} minutes.`);
        return false;
      } else {
        localStorage.removeItem("event_participant_lock_time");
        localStorage.removeItem("event_participant_attempts");
        setRateLimitError("");
      }
    }
    return true;
  };

  const recordFailedAttempt = () => {
    if (mode === "signup") return;
    let attempts = parseInt(localStorage.getItem("event_participant_attempts") || "0");
    attempts++;
    localStorage.setItem("event_participant_attempts", attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem("event_participant_lock_time", (Date.now() + LOCKOUT_TIME).toString());
      checkRateLimit();
    }
  };

  const resetAttempts = () => {
    localStorage.removeItem("event_participant_attempts");
    localStorage.removeItem("event_participant_lock_time");
    setRateLimitError("");
  };

  async function onSubmit(e: React.FormEvent) {
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
          await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: "participant" } as never);
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in");
        resetAttempts();
      }
      if (redirectTo && redirectTo.startsWith("/")) {
        navigate({ to: redirectTo });
      } else {
        navigate({ to: "/dashboard/participant" });
      }
    } catch (err) {
      recordFailedAttempt();
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {rateLimitError && (
        <div className="bg-destructive/15 text-destructive border border-destructive/50 text-sm p-3 rounded-md font-medium">
          {rateLimitError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="p-email">Email</Label>
        <Input
          id="p-email"
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
          <Label htmlFor="p-password">Password</Label>
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
          id="p-password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? "At least 8 characters" : "Password"}
        />
        {mode === "signup" && <PasswordStrengthBar password={password} />}
      </div>
      <Button type="submit" className="w-full" disabled={loading || !!rateLimitError}>
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
