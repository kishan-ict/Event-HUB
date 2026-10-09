import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";
import { getAuthErrorMessage, isExistingAccountError } from "@/lib/auth-errors";

export const Route = createFileRoute("/events/create")({
  head: () => ({
    meta: [{ title: "Create event — EVENT-HUB" }],
  }),
  component: CreateEvent,
});

const step1Schema = z
  .object({
    name: z.string().trim().min(2).max(100),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

const step2Schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function CreateEvent() {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    const parsed = step1Schema.safeParse({ name, startDate, endDate });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    const parsed = step2Schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    try {
      let userId: string | undefined;
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpErr) {
        if (!isExistingAccountError(signUpErr)) throw signUpErr;

        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signInErr) throw signInErr;

        const { data: currentUser, error: userErr } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
        if (userErr || !currentUser.user) throw userErr ?? new Error("Sign in failed");
        userId = currentUser.user.id;
      } else {
        const user = signUp.user;
        if (!user) throw new Error("Sign up failed");
        userId = user.id;

        // New accounts are configured for instant access. If an older auth setting
        // still returns no session, try a normal sign-in so the event can be saved.
        if (!signUp.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });
          if (signInErr) throw signInErr;
        }
      }

      if (!userId) throw new Error("Account setup failed");

      // Assign host role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "host" } as never);
      if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;

      // Create event with unique slug
      const base = slugify(name);
      const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { error: eventErr } = await supabase.from("events").insert({
        host_id: userId,
        name,
        slug,
        start_date: startDate,
        end_date: endDate,
        is_published: true,
        require_approval: true,
      } as never);
      if (eventErr) throw eventErr;

      toast.success("Event created");
      navigate({ to: "/dashboard/host" });
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

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
            <div className="text-sm font-semibold">Create your event</div>
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Step {step} of 2
            </div>
          </div>
        </div>

        <Stepper step={step} />

        <Card className="mt-4 border-border/60 bg-card/80 p-6 shadow-card backdrop-blur">
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hack the Future 2026"
                  required
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start">Start date</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End date</Label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-surface/60 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Event
                </div>
                <div className="mt-1 text-sm font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">
                  {startDate} → {endDate}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Your email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating…" : "Create event & account"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth/host" className="text-foreground underline">
            Host sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 }) {
  const items = [
    { n: 1, label: "Event details" },
    { n: 2, label: "Your account" },
  ];
  return (
    <div className="flex items-center gap-2">
      {items.map((it, i) => (
        <div key={it.n} className="flex flex-1 items-center gap-2">
          <div
            className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-medium ${
              step >= it.n
                ? "border-brand bg-brand text-white"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {step > it.n ? <Check className="h-3 w-3" /> : it.n}
          </div>
          <div className="text-xs text-muted-foreground">{it.label}</div>
          {i < items.length - 1 && <div className="h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}
