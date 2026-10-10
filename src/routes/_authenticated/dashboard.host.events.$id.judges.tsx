import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase, SUPABASE_URL, SUPABASE_KEY } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gavel, Plus, Trash2, X, Copy, KeySquare } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/judges"
)({
  head: () => ({ meta: [{ title: "Judges & criteria — EVENT-HUB" }] }),
  component: JudgesAdmin,
});

function JudgesAdmin() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ["event-judges-info", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, categories")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["judge-assignments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judge_assignments")
        .select("*")
        .eq("event_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: criteria } = useQuery({
    queryKey: ["criteria", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("judging_criteria")
        .select("*")
        .eq("event_id", id)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (event) {
      const tourKey = `host-judges-tour-seen-${id}`;
      if (!localStorage.getItem(tourKey)) {
        setTimeout(() => {
          const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
              { element: '#tour-judges-categories', popover: { title: 'Categories 🏷️', description: 'Define the different categories or tracks your participants will be grouped into.', side: "bottom", align: 'start' } },
              { element: '#tour-judges-criteria', popover: { title: 'Judging Criteria 🎯', description: 'What are you grading on? Add criteria like "Design", "Code Quality", etc., and set max scores.', side: "bottom", align: 'start' } },
              { element: '#tour-judges-invite', popover: { title: 'Invite Judges 👨‍⚖️', description: 'Invite people via their email to become judges. They will get their own dashboard to score participants!', side: "top", align: 'start' } },
            ],
            onDestroyStarted: () => {
              localStorage.setItem(tourKey, 'true');
              driverObj.destroy();
            }
          });
          driverObj.drive();
        }, 500);
      }
    }
  }, [event, id]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <Link
          to="/dashboard/host"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{event?.name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Judges & criteria
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <div id="tour-judges-categories">
          <CategoriesEditor
            eventId={id}
            categories={event?.categories ?? []}
            onSaved={() => qc.invalidateQueries({ queryKey: ["event-judges-info", id] })}
          />
        </div>
        <div id="tour-judges-criteria">
          <CriteriaEditor
            eventId={id}
            criteria={criteria ?? []}
            onChange={() => qc.invalidateQueries({ queryKey: ["criteria", id] })}
          />
        </div>
        <div id="tour-judges-invite">
          <JudgesSection
            eventId={id}
            categories={event?.categories ?? []}
            assignments={assignments ?? []}
            onChange={() => qc.invalidateQueries({ queryKey: ["judge-assignments", id] })}
          />
        </div>
      </main>
    </div>
  );
}

function CategoriesEditor({
  eventId,
  categories,
  onSaved,
}: {
  eventId: string;
  categories: string[];
  onSaved: () => void;
}) {
  const [items, setItems] = useState<string[]>(categories);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setItems(categories), [categories]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({ categories: items } as never)
      .eq("id", eventId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Categories saved");
      onSaved();
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Categories</h2>
      <p className="text-sm text-muted-foreground">
        Tracks or divisions participants can compete in.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((c) => (
          <Badge key={c} variant="secondary" className="gap-1">
            {c}
            <button
              type="button"
              onClick={() => setItems((s) => s.filter((x) => x !== c))}
              className="ml-1 opacity-60 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-muted-foreground">No categories yet</span>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Design, Engineering"
          maxLength={80}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const v = input.trim();
            if (!v) return;
            if (items.includes(v)) return;
            setItems((s) => [...s, v]);
            setInput("");
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}

function CriteriaEditor({
  eventId,
  criteria,
  onChange,
}: {
  eventId: string;
  criteria: Array<{ id: string; name: string; description: string | null; max_score: number; order_index: number }>;
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState(10);
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (maxScore <= 0 || maxScore > 1000) {
      toast.error("Max score must be between 1 and 1000");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("judging_criteria").insert({
      event_id: eventId,
      name: name.trim().slice(0, 120),
      description: description.trim().slice(0, 500) || null,
      max_score: maxScore,
      order_index: criteria.length,
    } as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setName("");
      setDescription("");
      setMaxScore(10);
      toast.success("Criterion added");
      onChange();
    }
  }

  async function remove(critId: string) {
    const { error } = await supabase.from("judging_criteria").delete().eq("id", critId);
    if (error) toast.error(error.message);
    else onChange();
  }

  const total = criteria.reduce((s, c) => s + c.max_score, 0);

  return (
    <Card className="p-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Judging criteria</h2>
          <p className="text-sm text-muted-foreground">
            Define how judges score each submission.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Total points
          </div>
          <div className="text-2xl font-semibold">{total}</div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {criteria.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            No criteria yet
          </div>
        )}
        {criteria.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-card p-3"
          >
            <div className="min-w-0">
              <div className="font-medium">{c.name}</div>
              {c.description && (
                <div className="text-xs text-muted-foreground">{c.description}</div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-xs">/ {c.max_score}</span>
              <ConfirmDeleteDialog onConfirm={() => remove(c.id)} title="Delete Criterion?">
                <Button size="sm" variant="ghost">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </ConfirmDeleteDialog>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-5 grid gap-3 border-t border-border/60 pt-5 sm:grid-cols-[1fr_1fr_100px_auto]">
        <Input
          placeholder="Criterion name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
        <Input
          type="number"
          min={1}
          max={1000}
          value={maxScore}
          onChange={(e) => setMaxScore(Number(e.target.value))}
        />
        <Button type="submit" disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add criterion
        </Button>
      </form>
    </Card>
  );
}

function JudgesSection({
  eventId,
  categories,
  assignments,
  onChange,
}: {
  eventId: string;
  categories: string[];
  assignments: Array<{ id: string; judge_id: string; categories: string[] }>;
  onChange: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; pass: string } | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const tempPassword = password.trim() ? password.trim() : Math.random().toString(36).slice(-8) + "A1!";
      
      const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data, error } = await adminAuthClient.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: {
          data: { role: "judge" }
        }
      });

      if (error && error.message.includes("User already registered")) {
        // In a real app we'd look up the ID by email if they exist, but for now we throw
        throw new Error("User already exists. Backend lookup not fully implemented for existing users.");
      }
      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user");

      const judgeId = data.user.id;

      const { error: upErr } = await supabase
        .from("judge_assignments")
        .upsert(
          {
            event_id: eventId,
            judge_id: judgeId,
            categories: selectedCats,
          },
          { onConflict: "event_id,judge_id" }
        );

      if (upErr) throw new Error(upErr.message);

      setNewCredentials({ email: email.trim(), pass: tempPassword });
      toast.success("Judge assigned and account generated");
      setEmail("");
      setPassword("");
      setSelectedCats([]);
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setBusy(false);
    }
  }

  async function remove(assignmentId: string) {
    const { error } = await supabase
      .from("judge_assignments")
      .delete()
      .eq("id", assignmentId);
    if (error) toast.error(error.message);
    else onChange();
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Judges</h2>
      <p className="text-sm text-muted-foreground">
        Generate credentials for your judges so they can log in at{" "}
        <span className="font-mono">/auth/judge</span>.
      </p>
      <form onSubmit={invite} className="mt-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="j-email">Judge email</Label>
            <Input
              id="j-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="judge@example.com"
              required
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Auto-generate if blank"
            />
          </div>
        </div>
        {categories.length > 0 && (
          <div className="space-y-2">
            <Label>Categories to review</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = selectedCats.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setSelectedCats((s) =>
                        active ? s.filter((x) => x !== c) : [...s, c]
                      )
                    }
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "border-foreground/60 bg-surface-elevated"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Button type="submit" disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Generating…" : "Generate judge account"}
        </Button>
      </form>

      {newCredentials && (
        <div className="mt-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-start gap-3">
            <KeySquare className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-emerald-700">Credentials Generated</h4>
              <p className="text-sm text-emerald-600/80 mb-3">
                Copy and send this temporary password to the judge. They will use it to log in at <strong>/auth/judge</strong>.
              </p>
              <div className="flex items-center gap-4 font-mono text-sm bg-white p-2 rounded border">
                <span><strong>Email:</strong> {newCredentials.email}</span>
                <span><strong>Password:</strong> {newCredentials.pass}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-6"
                  onClick={() => {
                    navigator.clipboard.writeText(`Login: ${newCredentials.email}\nPassword: ${newCredentials.pass}`);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {assignments.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-6 text-center">
            <Gavel className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">No judges assigned yet</p>
          </div>
        ) : (
          assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card p-3"
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-xs">{a.judge_id}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {a.categories.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">All categories</span>
                  ) : (
                    a.categories.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">
                        {c}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <ConfirmDeleteDialog onConfirm={() => remove(a.id)} title="Delete Judge Assignment?">
                <Button size="sm" variant="ghost">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </ConfirmDeleteDialog>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
