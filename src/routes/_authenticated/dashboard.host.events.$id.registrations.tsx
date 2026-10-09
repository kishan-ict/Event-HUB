import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, X, RotateCcw, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { RegField } from "@/lib/registration-fields";
import { updateRegistrationStatus } from "@/lib/registrations.functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/registrations",
)({
  head: () => ({ meta: [{ title: "Registrations — EVENT-HUB" }] }),
  component: RegistrationsPage,
});

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "confirmed";

function RegistrationsPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const updateStatus = updateRegistrationStatus;
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<null | "approved" | "rejected" | "pending">(null);

  const { data: event } = useQuery({
    queryKey: ["event-reg-meta", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, require_approval, is_published, registration_fields")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, status, data, created_at, user_id, attendance_status, checked_in_at, attenders(name)")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fields = useMemo(
    () => (event?.registration_fields as unknown as RegField[]) ?? [],
    [event],
  );

  async function toggleApproval(next: boolean) {
    const { error } = await supabase
      .from("events")
      .update({ require_approval: next } as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next ? "New registrations will need approval" : "Registrations auto-confirmed");
    qc.invalidateQueries({ queryKey: ["event-reg-meta", id] });
  }

  async function setStatus(regId: string, status: "approved" | "rejected" | "pending") {
    try {
      await updateStatus({ registrationId: regId, decision: status });
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["event-registrations", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function bulkSetStatus(status: "approved" | "rejected" | "pending") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(status);
    const toastId = toast.loading(
      `Updating ${ids.length} registration${ids.length === 1 ? "" : "s"}…`,
    );
    let ok = 0;
    let failed = 0;
    // Process in small parallel batches to avoid flooding the server.
    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      const slice = ids.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map((rid) =>
          updateStatus({ registrationId: rid, decision: status }),
        ),
      );
      for (const r of results) {
        if (r.status === "fulfilled") ok += 1;
        else failed += 1;
      }
    }
    setBulkBusy(null);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["event-registrations", id] });
    if (failed === 0) {
      toast.success(`Marked ${ok} as ${status}`, { id: toastId });
    } else {
      toast.error(`${ok} updated, ${failed} failed`, { id: toastId });
    }
  }

  function toggleOne(regId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(regId);
      else next.delete(regId);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!needle) return true;
      const blob = JSON.stringify(r.data ?? {}).toLowerCase();
      return blob.includes(needle) || r.id.toLowerCase().includes(needle);
    });
  }, [rows, filter, q]);

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, rejected: 0, confirmed: 0 };
    for (const r of rows ?? []) {
      c.all += 1;
      const s = r.status as keyof typeof c;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [rows]);

  const firstTextFieldId = fields.find(
    (f) => f.type !== "checkbox" && f.type !== "textarea",
  )?.id;

  const visibleIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const selectedVisible = useMemo(
    () => visibleIds.filter((rid) => selected.has(rid)),
    [visibleIds, selected],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someVisibleSelected =
    selectedVisible.length > 0 && !allVisibleSelected;

  // Prune selection when the underlying rows change (e.g. after a mutation).
  useEffect(() => {
    if (!rows) return;
    const alive = new Set(rows.map((r) => r.id));
    setSelected((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (alive.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [rows]);

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) for (const rid of visibleIds) next.add(rid);
      else for (const rid of visibleIds) next.delete(rid);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <Link
          to="/dashboard/host"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{event?.name ?? ""}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Registrations
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-semibold">Require approval</div>
            <p className="text-xs text-muted-foreground">
              When on, new registrations start as <b>pending</b> until you approve them.
            </p>
          </div>
          <Switch
            checked={!!event?.require_approval}
            onCheckedChange={toggleApproval}
          />
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "pending", "approved", "confirmed", "rejected"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === k
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-muted-foreground bg-surface hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {k} <span className="ml-1 opacity-60 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{counts[k]}</span>
            </button>
          ))}
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search registrations…"
              className="h-8 w-64 pl-7 text-xs"
            />
          </div>
        </div>

        {selected.size > 0 && (
          <Card className="flex flex-wrap items-center gap-2 border-primary/40 bg-primary/5 p-3">
            <div className="text-xs font-medium">
              {selected.size} selected
              {someVisibleSelected || allVisibleSelected
                ? ""
                : " (none in current view)"}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => bulkSetStatus("approved")}
                disabled={bulkBusy !== null}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                {bulkBusy === "approved" ? "Approving…" : "Approve selected"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => bulkSetStatus("rejected")}
                disabled={bulkBusy !== null}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                {bulkBusy === "rejected" ? "Rejecting…" : "Reject selected"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => bulkSetStatus("pending")}
                disabled={bulkBusy !== null}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                {bulkBusy === "pending" ? "Resetting…" : "Reset to pending"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(new Set())}
                disabled={bulkBusy !== null}
              >
                Clear
              </Button>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="grid place-items-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-16 text-center mt-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No participants found</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Try adjusting your filters or wait for new registrations to arrive.
            </p>
          </div>
        ) : (
          <Card className="divide-y divide-border/60">
            <div className="flex items-center gap-3 bg-surface/50 px-4 py-2 text-xs text-muted-foreground">
              <Checkbox
                checked={
                  allVisibleSelected
                    ? true
                    : someVisibleSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(v) => toggleAllVisible(v === true)}
                aria-label="Select all in view"
              />
              <span>
                {selectedVisible.length > 0
                  ? `${selectedVisible.length} of ${visibleIds.length} selected`
                  : `Select all (${visibleIds.length})`}
              </span>
            </div>
            {filtered.map((r) => {
              const values = (r.data ?? {}) as Record<string, string | boolean>;
              const display = firstTextFieldId
                ? String(values[firstTextFieldId] ?? "")
                : "";
              const isSelected = selected.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`flex flex-wrap items-center gap-3 p-4 ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(v) => toggleOne(r.id, v === true)}
                    aria-label="Select registration"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {display || "Registration"}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      #{r.id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
                    </div>
                    {r.attendance_status && r.attendance_status !== "pending" && (
                      <div className="text-xs mt-1 font-medium">
                        {r.attendance_status === "present" ? (
                          <span className="text-emerald-600">✓ Present</span>
                        ) : (
                          <span className="text-muted-foreground">✕ Absent</span>
                        )}
                        <span className="text-muted-foreground font-normal ml-1">
                          · Checked in by {(r.attenders as any)?.name || "Unknown"}
                        </span>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                  <div className="flex items-center gap-1.5">
                    {r.status !== "approved" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "approved")}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    )}
                    {(r.status === "approved" || r.status === "rejected") && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "pending")}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "approved" || status === "confirmed"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}
