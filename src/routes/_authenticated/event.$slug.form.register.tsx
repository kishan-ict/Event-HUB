import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  validateField,
  validateRegistration,
  type RegField,
} from "@/lib/registration-fields";
import { submitRegistration } from "@/lib/registrations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Sparkles, CheckCircle2, AlertCircle, Users, UserPlus, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/event/$slug/form/register")({
  head: () => ({ meta: [{ title: "Register — EVENT-HUB" }] }),
  component: RegisterPage,
});

type Confirmation = {
  id: string;
  status: string;
  createdAt: string;
  values: Record<string, string | boolean>;
};

function RegisterPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const submit = submitRegistration;

  const { data: event, isLoading } = useQuery({
    queryKey: ["register-event", slug],
    queryFn: async () => {
      // Fetch first; then determine visibility (public if published, otherwise host preview).
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, host_id, theme_color, registration_fields, is_published, capacity")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", data.id);

      const eventData = { ...data, registration_count: count ?? 0 };

      if (data.is_published) return eventData;
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (u.user && data.host_id === u.user.id) return eventData;
      return null;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["my-registration", slug, event?.id],
    enabled: !!event?.id,
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user || !event?.id) return null;
      const { data } = await supabase
        .from("registrations")
        .select("*")
        .eq("event_id", event.id)
        .eq("user_id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const fields = useMemo(
    () => (event?.registration_fields as unknown as RegField[]) ?? [],
    [event],
  );

  const clientErrors = useMemo(
    () => validateRegistration(fields, values),
    [fields, values],
  );

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Event not available</h1>
          <Link to="/" className="mt-3 inline-block text-sm underline">Go home</Link>
        </div>
      </div>
    );
  }

  if (existing || confirmation) {
    const conf: Confirmation | null =
      confirmation ??
      (existing
        ? {
            id: (existing as { id: string }).id,
            status: (existing as { status: string }).status,
            createdAt: (existing as { created_at: string }).created_at,
            values: ((existing as { data?: Record<string, string | boolean> }).data ?? {}),
          }
        : null);
    return (
      <div className="grid min-h-screen place-items-center px-6 py-10">
        <Card className="w-full max-w-lg p-8">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-semibold">
              {conf?.status === "pending" ? "Registration received" : "You're registered"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {conf?.status === "pending"
                ? `Thanks! Your registration for ${event.name} is pending host approval.`
                : `You're all set for ${event.name}.`}
            </p>
          </div>
          {conf && (
            <div className="mt-6 space-y-3 rounded-md border border-border/60 bg-surface/40 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-widest text-muted-foreground">
                  Reference
                </span>
                <span className="font-mono">#{conf.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-widest text-muted-foreground">
                  Status
                </span>
                <span className="font-mono capitalize">{conf.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-widest text-muted-foreground">
                  Submitted
                </span>
                <span>{new Date(conf.createdAt).toLocaleString()}</span>
              </div>
              {fields.length > 0 && (
                <div className="border-t border-border/60 pt-3">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Your details
                  </div>
                  <dl className="space-y-1.5 text-xs">
                    {fields.slice(0, 6).map((f) => {
                      const v = conf.values?.[f.id];
                      const display =
                        typeof v === "boolean" ? (v ? "Yes" : "No") : (v as string) || "—";
                      return (
                        <div key={f.id} className="flex items-start justify-between gap-3">
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd className="max-w-[60%] truncate text-right">{display}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}
            </div>
            </div>
          )}

          <TeamOnboarding eventId={event.id} slug={slug} />

        </Card>
      </div>
    );
  }

  const isPreview = !event.is_published;
  const combinedErrors: Record<string, string> = { ...clientErrors, ...serverErrors };
  const hasErrors = Object.keys(combinedErrors).length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) {
      toast.message("Preview mode", {
        description: "Publish the event to accept real registrations.",
      });
      return;
    }
    // Mark everything touched so all errors surface.
    setTouched(Object.fromEntries(fields.map((f) => [f.id, true])));
    setServerErrors({});
    if (Object.keys(clientErrors).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({ eventId: event!.id, values });
      toast.success("Registration submitted");
      setConfirmation({
        id: res.id,
        status: res.status,
        createdAt: res.createdAt,
        values,
      });
    } catch (err: unknown) {
      // TanStack Start rethrows server errors including custom props.
      const withFields = err as { fieldErrors?: Record<string, string>; message?: string };
      if (withFields?.fieldErrors && typeof withFields.fieldErrors === "object") {
        setServerErrors(withFields.fieldErrors);
        toast.error("Please fix the highlighted fields");
      } else {
        toast.error(withFields?.message ?? "Failed to register");
      }
    } finally {
      setSubmitting(false);
    }
  }
  // silence unused-var linter for navigate in preview mode
  void navigate;

  const theme = event.theme_color ?? undefined;

  return (
    <div className="min-h-screen bg-background">
      {isPreview && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-2 text-center text-xs text-amber-900 dark:text-amber-200">
          Draft preview — publish the event to accept real registrations.
        </div>
      )}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <Link to="/event/$slug" params={{ slug }} className="flex items-center gap-2">
            <div className="flex items-center h-8">
              <img src="/favicon.png" alt="EVENT-HUB Logo" className="h-full w-auto object-contain" />
            </div>
            <span className="text-sm font-semibold">{event.name}</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Register</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill out the details below to secure your spot.
        </p>
        
        {event.capacity && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium bg-surface/50">
            <span>{event.registration_count} / {event.capacity} spots filled</span>
          </div>
        )}
        <Card className="mt-6 p-6">
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            {fields.map((f) => {
              const showError = touched[f.id] || !!serverErrors[f.id];
              return (
                <FieldRenderer
                  key={f.id}
                  field={f}
                  value={values[f.id]}
                  error={showError ? combinedErrors[f.id] : undefined}
                  onChange={(v) => {
                    setValues((s) => ({ ...s, [f.id]: v }));
                    if (serverErrors[f.id]) {
                      setServerErrors((s) => {
                        const n = { ...s };
                        delete n[f.id];
                        return n;
                      });
                    }
                  }}
                  onBlur={() => setTouched((s) => ({ ...s, [f.id]: true }))}
                />
              );
            })}
            {event.capacity && event.registration_count >= event.capacity ? (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
                <AlertCircle className="mx-auto h-6 w-6 mb-2" />
                <p className="font-semibold">Event is at capacity</p>
                <p className="text-sm mt-1">No more spots are available.</p>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={submitting || isPreview || (hasErrors && Object.keys(touched).length > 0)}
                className="w-full"
                style={theme ? { backgroundColor: theme, color: "white" } : undefined}
              >
                {isPreview
                  ? "Preview only"
                  : submitting
                    ? "Submitting…"
                    : "Submit registration"}
              </Button>
            )}
          </form>
        </Card>
      </main>
    </div>
  );
}


export function FieldRenderer({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: {
  field: RegField;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}) {
  const id = `field-${field.id}`;
  const errId = `${id}-err`;

  // In the host preview we don't wire onChange; still validate locally to
  // demonstrate the message. When onBlur is undefined (builder preview),
  // fall back to showing an error only when a live error prop is passed in.
  const liveError =
    error ??
    (typeof value !== "undefined" ? (validateField(field, value) ?? undefined) : undefined);
  const showError = error !== undefined ? !!error : false; // parent controls visibility

  if (field.type === "checkbox") {
    return (
      <div>
        <label htmlFor={id} className="flex items-start gap-2">
          <Checkbox
            id={id}
            checked={!!value}
            onCheckedChange={(c) => onChange(!!c)}
            onBlur={onBlur}
            disabled={disabled}
            aria-invalid={showError || undefined}
            aria-describedby={showError ? errId : undefined}
          />
          <span className="text-sm leading-tight">
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </span>
        </label>
        {showError && (
          <p id={errId} className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}
        {/* mute unused warning when parent doesn't pass error */}
        <span className="sr-only">{liveError && ""}</span>
      </div>
    );
  }

  const invalidCls = showError ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
          maxLength={5000}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errId : undefined}
          className={invalidCls}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errId : undefined}
          className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm ${
            showError ? "border-destructive" : "border-input"
          }`}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type={field.type}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          maxLength={field.type === "email" ? 255 : 500}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errId : undefined}
          className={invalidCls}
        />
      )}
      )}
    </div>
  );
}

function TeamOnboarding({ eventId, slug }: { eventId: string, slug: string }) {
  const [mode, setMode] = useState<"choose" | "create" | "join" | "solo">("choose");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!teamName.trim()) return toast.error("Team name required");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getSession();
      if (!u.session?.user) throw new Error("Not signed in");
      
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: newTeam, error: teamErr } = await supabase
        .from("teams")
        .insert({ event_id: eventId, name: teamName, invite_code: code })
        .select()
        .single();
      if (teamErr) throw teamErr;

      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({ team_id: newTeam.id, user_id: u.session.user.id, role: "leader", status: "accepted" });
      if (memberErr) throw memberErr;

      toast.success("Team created!");
      navigate({ to: "/dashboard/participant/events/$eventId/team", params: { eventId } });
    } catch (err: any) {
      toast.error(err.message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return toast.error("Invite code required");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getSession();
      if (!u.session?.user) throw new Error("Not signed in");

      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .select("id")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .maybeSingle();
        
      if (teamErr) throw teamErr;
      if (!team) throw new Error("Invalid invite code");

      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: u.session.user.id, role: "member", status: "accepted" });
      
      if (memberErr) {
        if (memberErr.code === '23505') throw new Error("You are already in this team");
        throw memberErr;
      }

      toast.success("Joined team!");
      navigate({ to: "/dashboard/participant/events/$eventId/team", params: { eventId } });
    } catch (err: any) {
      toast.error(err.message || "Failed to join team");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "choose") {
    return (
      <div className="mt-8 space-y-4">
        <h3 className="font-semibold text-center text-lg">How would you like to participate?</h3>
        <div className="grid gap-3">
          <Button variant="outline" className="h-auto p-4 justify-start gap-4" onClick={() => navigate({ to: "/dashboard/participant/events/$eventId/info", params: { eventId } })}>
            <div className="h-10 w-10 shrink-0 bg-brand/10 text-brand rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Participate Solo</div>
              <div className="text-xs text-muted-foreground font-normal">Work on your own project.</div>
            </div>
          </Button>
          <Button variant="outline" className="h-auto p-4 justify-start gap-4" onClick={() => setMode("create")}>
            <div className="h-10 w-10 shrink-0 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Create a Team</div>
              <div className="text-xs text-muted-foreground font-normal">Start a new team and invite others.</div>
            </div>
          </Button>
          <Button variant="outline" className="h-auto p-4 justify-start gap-4" onClick={() => setMode("join")}>
            <div className="h-10 w-10 shrink-0 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Join a Team</div>
              <div className="text-xs text-muted-foreground font-normal">Use an invite code to join an existing team.</div>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setMode("choose")} className="-ml-3 text-muted-foreground">
        ← Back
      </Button>
      
      {mode === "create" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Create your Team</h3>
          <p className="text-sm text-muted-foreground">You'll be able to invite your teammates using a 6-character code after creating the team.</p>
          <div className="space-y-2">
            <Label>Team Name</Label>
            <Input placeholder="Awesome Hackers" value={teamName} onChange={e => setTeamName(e.target.value)} />
          </div>
          <Button className="w-full" disabled={loading} onClick={handleCreate}>
            {loading ? "Creating..." : "Create Team"}
          </Button>
        </div>
      )}

      {mode === "join" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Join a Team</h3>
          <p className="text-sm text-muted-foreground">Ask your team leader for the 6-character invite code.</p>
          <div className="space-y-2">
            <Label>Invite Code</Label>
            <Input placeholder="e.g. A1B2C3" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="uppercase" />
          </div>
          <Button className="w-full" disabled={loading} onClick={handleJoin}>
            {loading ? "Joining..." : "Join Team"}
          </Button>
        </div>
      )}
    </div>
  );
}
