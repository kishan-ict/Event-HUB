import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./auth.host";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — EVENT-HUB" }] }),
  component: ResetPassword,
});

const schema = z
  .object({
    password: z.string().min(6).max(128),
    confirm: z.string().min(6).max(128),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

// Per-browser attempt limit to blunt brute-force attempts against the
// recovery session. Backend has no shared rate-limiting primitive today.
const ATTEMPT_KEY = "sc:reset-attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function readAttempts(): { count: number; until: number } {
  if (typeof window === "undefined") return { count: 0, until: 0 };
  try {
    const raw = window.localStorage.getItem(ATTEMPT_KEY);
    if (!raw) return { count: 0, until: 0 };
    const v = JSON.parse(raw);
    return { count: Number(v.count) || 0, until: Number(v.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
}

function writeAttempts(v: { count: number; until: number }) {
  try {
    window.localStorage.setItem(ATTEMPT_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and emits an event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const a = readAttempts();
    setLockedUntil(a.until > Date.now() ? a.until : 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      sub.subscription.unsubscribe();
      clearInterval(t);
    };
  }, []);

  const locked = lockedUntil > now;
  const lockedMin = Math.max(1, Math.ceil((lockedUntil - now) / 60000));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) {
        const a = readAttempts();
        const nextCount = a.count + 1;
        const nextUntil =
          nextCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
        writeAttempts({ count: nextCount, until: nextUntil });
        setLockedUntil(nextUntil);
        throw error;
      }
      writeAttempts({ count: 0, until: 0 });
      toast.success("Password updated. Signing you in…");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Set a new password">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          {ready
            ? "Enter your new password below."
            : "Open this page from the reset link in your email."}
        </p>
      </div>
      {locked && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Too many attempts. Try again in about {lockedMin} minute
          {lockedMin === 1 ? "" : "s"}.
        </div>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-pass">New password</Label>
          <Input
            id="new-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={!ready || locked}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-pass">Confirm password</Label>
          <Input
            id="confirm-pass"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            disabled={!ready || locked}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !ready || locked}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}
