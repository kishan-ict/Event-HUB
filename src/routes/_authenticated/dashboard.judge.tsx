import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, PageHeader, StatCard, EmptyState } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/judge")({
  head: () => ({ meta: [{ title: "Judge dashboard — EVENT-HUB" }] }),
  component: JudgeDashboard,
});

function JudgeDashboard() {
  const matchRoute = useMatchRoute();
  const isOverview = matchRoute({ to: "/dashboard/judge", fuzzy: false });

  const { data: assignments } = useQuery({
    queryKey: ["judge-my-assignments"],
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("judge_assignments")
        .select("id, event_id, categories, events(id, name, slug, start_date, end_date)")
        .eq("judge_id", u.user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventIds = (assignments ?? []).map((a) => a.event_id);
  const { data: submissions } = useQuery({
    queryKey: ["judge-submissions", eventIds.join(",")],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, event_id, title, category, status")
        .in("event_id", eventIds)
        .neq("status", "draft");
      return data ?? [];
    },
  });

  const total = submissions?.length ?? 0;
  const scored = submissions?.filter((s) => s.status === "scored").length ?? 0;

  return (
    <DashboardShell role="judge">
      {isOverview ? (
        <>
          <PageHeader
            title="Your assignments"
            subtitle="Review submissions and score against event criteria."
          />
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Events" value={(assignments ?? []).length} />
              <StatCard label="To review" value={total - scored} />
              <StatCard label="Scored" value={scored} />
            </div>

            {(assignments ?? []).length === 0 ? (
              <div className="mt-8">
                <EmptyState
                  icon={Gavel}
                  title="No assignments yet"
                  description="An event host will invite you by email to judge their event."
                />
              </div>
            ) : (
              <div className="mt-8 space-y-6">
                {assignments!.map((a) => {
                  const evt = a.events;
                  if (!evt) return null;
                  const eventSubs = (submissions ?? []).filter((s) => s.event_id === a.event_id);
                  return (
                    <Card key={a.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold">{evt.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {evt.start_date} → {evt.end_date}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          <Link to="/dashboard/judge/events/$eventId/schedule" params={{ eventId: a.event_id }}>
                            <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                              <Calendar className="mr-1 h-3 w-3" /> Schedule
                            </Button>
                          </Link>
                          {a.categories.length === 0 ? (
                            <Badge variant="secondary">All categories</Badge>
                          ) : (
                            a.categories.map((c) => (
                              <Badge key={c} variant="secondary">{c}</Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Submissions to review · {eventSubs.length}
                        </div>
                        {eventSubs.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No submissions yet.
                          </p>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {eventSubs.map((s) => (
                              <Card key={s.id} className="p-4 flex flex-col border border-border/60 bg-surface/30">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold truncate">{s.title}</h4>
                                  <div className="text-xs text-muted-foreground mt-1">{s.category || "Uncategorized"}</div>
                                </div>
                                <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/60">
                                  <Badge variant={s.status === "scored" ? "default" : "secondary"}>
                                    {s.status === "scored" ? "Scored" : "Pending"}
                                  </Badge>
                                  <Link
                                    to="/dashboard/judge/events/$eventId/submissions/$submissionId"
                                    params={{ eventId: a.event_id, submissionId: s.id }}
                                  >
                                    <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs h-8 px-4">
                                      {s.status === "scored" ? "Update Score" : "Score"}
                                    </Button>
                                  </Link>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </DashboardShell>
  );
}
