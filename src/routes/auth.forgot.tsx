import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./auth.host";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({ meta: [{ title: "Reset password — EVENT-HUB" }] }),
  component: ForgotPassword,
});

const schema = z.object({ email: z.string().trim().email().max(255) });

// Client-side abuse protection: cooldown between requests, and lockout after
// too many in a short window. The backend has no shared rate-limiting
// primitive, so this is best-effort per-browser guardrail.
const REQ_KEY = "sc:forgot-attempts";
const COOLDOWN_MS = 60 * 1000;           // 60s between sends
const WINDOW_MS = 15 * 60 * 1000;        // 15 min rolling window
const MAX_IN_WINDOW = 5;                  // 5 sends per window
const LOCKOUT_MS = 30 * 60 * 1000;        // 30 min lockout after limit

type Attempts = { history: number[]; lockedUntil: number };

function readAttempts(): Attempts {
  if (typeof window === "undefined") return { history: [], lockedUntil: 0 };
  try {
    const raw = window.localStorage.getItem(REQ_KEY);
    if (!raw) return { history: [], lockedUntil: 0 };
    const v = JSON.parse(raw);
    return {
      history: Array.isArray(v.history) ? v.history.map(Number) : [],
      lockedUntil: Number(v.lockedUntil) || 0,
    };
  } catch {
    return { history: [], lockedUntil: 0 };
  }
}

function writeAttempts(v: Attempts) {
  try {
    window.localStorage.setItem(REQ_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const a = readAttempts();
    setLockedUntil(a.lockedUntil > Date.now() ? a.lockedUntil : 0);
    const last = a.history[a.history.length - 1] ?? 0;
    setCooldownUntil(last + COOLDOWN_MS);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const locked = lockedUntil > now;
  const cooling = cooldownUntil > now && !locked;
  const cooldownSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const lockedMin = Math.max(1, Math.ceil((lockedUntil - now) / 60000));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || cooling) return;
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      const a = readAttempts();
      const nowMs = Date.now();
      const history = [...a.history.filter((t) => nowMs - t < WINDOW_MS), nowMs];
      const nextLock =
        history.length >= MAX_IN_WINDOW ? nowMs + LOCKOUT_MS : a.lockedUntil;
      writeAttempts({ history, lockedUntil: nextLock });
      setCooldownUntil(nowMs + COOLDOWN_MS);
      setLockedUntil(nextLock > nowMs ? nextLock : 0);

      setSent(true);
      toast.success("Check your email for the reset link");
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Password recovery">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>
      </div>
      {locked && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Too many reset requests. Try again in about {lockedMin} minute
          {lockedMin === 1 ? "" : "s"}.
        </div>
      )}
      {sent ? (
        <div className="mt-6 rounded-md border border-border/60 bg-muted/40 p-4 text-sm">
          If an account exists for <span className="font-medium">{email}</span>, a reset link
          is on its way. Check your inbox (and spam folder).
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="f-email">Email</Label>
            <Input
              id="f-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              disabled={locked}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || locked || cooling}
          >
            {loading
              ? "Sending…"
              : cooling
                ? `Wait ${cooldownSec}s`
                : locked
                  ? "Temporarily locked"
                  : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Remembered it?{" "}
        <Link to="/auth/host" className="text-foreground underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
