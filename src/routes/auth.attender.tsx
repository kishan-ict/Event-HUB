import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./auth.host";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { getAuthErrorMessage } from "@/lib/auth-errors";

const searchSchema = z.object({
  redirect: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/auth/attender")({
  head: () => ({ meta: [{ title: "Attender sign in — EVENT-HUB" }] }),
  validateSearch: zodValidator(searchSchema),
  component: AttenderAuth,
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});

function AttenderAuth() {
  const { redirect } = useSearch({ from: "/auth/attender" });
  return (
    <AuthShell subtitle="For attenders (volunteers)">
      <div className="mt-6">
        <AttenderForm redirectTo={redirect} />
      </div>
    </AuthShell>
  );
}

function AttenderForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState("");
  const navigate = useNavigate();

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 15 * 60 * 1000;

  const checkRateLimit = () => {
    const lockTime = localStorage.getItem("event_attender_lock_time");
    if (lockTime) {
      if (Date.now() < parseInt(lockTime)) {
        const remainingMins = Math.ceil((parseInt(lockTime) - Date.now()) / 60000);
        setRateLimitError(`Too many failed attempts. Try again in ${remainingMins} minutes.`);
        return false;
      } else {
        localStorage.removeItem("event_attender_lock_time");
        localStorage.removeItem("event_attender_attempts");
        setRateLimitError("");
      }
    }
    return true;
  };

  const recordFailedAttempt = () => {
    let attempts = parseInt(localStorage.getItem("event_attender_attempts") || "0");
    attempts++;
    localStorage.setItem("event_attender_attempts", attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem("event_attender_lock_time", (Date.now() + LOCKOUT_TIME).toString());
      checkRateLimit();
    }
  };

  const resetAttempts = () => {
    localStorage.removeItem("event_attender_attempts");
    localStorage.removeItem("event_attender_lock_time");
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
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success("Signed in");
      resetAttempts();

      if (redirectTo && redirectTo.startsWith("/")) {
        navigate({ to: redirectTo });
      } else {
        navigate({ to: "/dashboard/attender" });
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
        <Label htmlFor="a-email">Email</Label>
        <Input
          id="a-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="attender@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="a-password">Password</Label>
        <Input
          id="a-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="Password provided by host"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !!rateLimitError}>
        {loading ? "Please wait…" : "Sign in"}
      </Button>
    </form>
  );
}
