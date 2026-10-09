import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { DashboardShell, PageHeader } from "@/components/dashboard-shell";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Profile & settings — EVENT-HUB" }] }),
  component: SettingsPage,
});

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name required")
  .max(80, "Display name too long");
const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.object({
  password: z.string().min(6, "At least 6 characters").max(128),
  confirm: z.string().min(6).max(128),
}).refine((v) => v.password === v.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

function useMyRole() {
  return useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .limit(1)
        .maybeSingle();
      return (data?.role as "host" | "judge" | "participant" | undefined) ?? "participant";
    },
  });
}

function SettingsPage() {
  const { data: role, isLoading } = useMyRole();
  if (isLoading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  return (
    <DashboardShell role={role}>
      <PageHeader
        title="Profile & settings"
        subtitle="Update your display name, email, and password."
        action={
          <Link
            to={
              role === "host"
                ? "/dashboard/host"
                : role === "judge"
                  ? "/dashboard/judge"
                  : "/dashboard/participant"
            }
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <ProfileCard />
        <EmailCard />
        <PasswordCard />
      </div>
    </DashboardShell>
  );
}

function ProfileCard() {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })().then(({ data }) => {
      const name =
        (data.user?.user_metadata?.display_name as string | undefined) ??
        (data.user?.user_metadata?.name as string | undefined) ??
        "";
      const port = (data.user?.user_metadata?.portfolio as string | undefined) ?? "";
      setDisplayName(name);
      setPortfolio(port);
      setInitial(name);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = displayNameSchema.safeParse(displayName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: parsed.data, portfolio },
      });
      if (error) throw error;
      setInitial(parsed.data);
      toast.success("Profile updated");
      qc.invalidateQueries();
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-8 max-w-3xl border-border/60">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand/20 text-brand text-2xl font-bold ring-4 ring-background">
            {displayName ? displayName.slice(0, 2).toUpperCase() : "U"}
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs">
            Change avatar
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
            Remove
          </Button>
        </div>
        
        {/* Form Section */}
        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Profile Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your personal information and how you appear to others.
            </p>
          </div>
          
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                maxLength={80}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio / Website</Label>
              <Input
                id="portfolio"
                value={portfolio}
                maxLength={200}
                onChange={(e) => setPortfolio(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Card>
  );
}

function EmailCard() {
  const [current, setCurrent] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })().then(({ data }) => {
      setCurrent(data.user?.email ?? "");
      setEmail(data.user?.email ?? "");
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    if (parsed.data === current) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: parsed.data },
        { emailRedirectTo: window.location.origin },
      );
      if (error) throw error;
      toast.success("Confirmation link sent", {
        description: "Check your new inbox to finish the change.",
      });
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold">Email</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Changes require confirmation from your new address.
      </p>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            maxLength={255}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving || email === current || !email}>
          {saving ? "Saving…" : "Update email"}
        </Button>
      </form>
    </Card>
  );
}

const PASSWORD_ATTEMPTS_KEY = "sc:pwd-change-attempts";
const PASSWORD_LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes
const PASSWORD_MAX_ATTEMPTS = 5;

function readAttempts(): { count: number; until: number } {
  if (typeof window === "undefined") return { count: 0, until: 0 };
  try {
    const raw = window.localStorage.getItem(PASSWORD_ATTEMPTS_KEY);
    if (!raw) return { count: 0, until: 0 };
    const v = JSON.parse(raw);
    return {
      count: Number(v.count) || 0,
      until: Number(v.until) || 0,
    };
  } catch {
    return { count: 0, until: 0 };
  }
}

function writeAttempts(v: { count: number; until: number }) {
  try {
    window.localStorage.setItem(PASSWORD_ATTEMPTS_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

function PasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    const a = readAttempts();
    setLockedUntil(a.until > Date.now() ? a.until : 0);
  }, []);

  const locked = lockedUntil > Date.now();
  const remainingMin = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (error) {
        const a = readAttempts();
        const nextCount = a.count + 1;
        const nextUntil =
          nextCount >= PASSWORD_MAX_ATTEMPTS ? Date.now() + PASSWORD_LOCKOUT_MS : 0;
        writeAttempts({ count: nextCount, until: nextUntil });
        setLockedUntil(nextUntil);
        throw error;
      }
      writeAttempts({ count: 0, until: 0 });
      setPassword("");
      setConfirm("");
      toast.success("Password updated");
      // Sign out to force re-auth on other devices (best-practice).
      setTimeout(() => {
        supabase.auth.signOut().then(() => navigate({ to: "/auth/host" }));
      }, 800);
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold">Password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a strong password. You'll be signed out on this device after updating.
      </p>
      {locked && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Too many attempts. Try again in about {remainingMin} minute
          {remainingMin === 1 ? "" : "s"}.
        </div>
      )}
      <form onSubmit={save} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            minLength={6}
            maxLength={128}
            onChange={(e) => setPassword(e.target.value)}
            disabled={locked}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            minLength={6}
            maxLength={128}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={locked}
          />
        </div>
        <Button type="submit" disabled={saving || locked || !password || !confirm}>
          {saving ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
