import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, PageHeader, EmptyState } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, CheckCheck, FileText, Megaphone, Pin, Users } from "lucide-react";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  event_id: string | null;
  read_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/dashboard/participant")({
  head: () => ({ meta: [{ title: "Participant dashboard — EVENT-HUB" }] }),
  component: ParticipantDashboard,
});

function ParticipantDashboard() {
  const matchRoute = useMatchRoute();
  const isOverview = matchRoute({ to: "/dashboard/participant", fuzzy: false });
  const queryClient = useQueryClient();
  const { data: regs, isLoading } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("registrations")
        .select("id, event_id, status, created_at, events(id, name, slug, start_date, end_date, theme_color)")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventIds = (regs ?? []).map((r) => r.event_id);
  const { data: subs } = useQuery({
    queryKey: ["my-submissions", eventIds.join(",")],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) return [];
      const { data } = await supabase
        .from("submissions")
        .select("id, event_id, title, status")
        .eq("user_id", u.user.id)
        .in("event_id", eventIds);
      return data ?? [];
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ["my-announcements", eventIds.join(",")],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, event_id, title, body, pinned, created_at, events(name, slug)")
        .in("event_id", eventIds)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: async () => {
      const { data } = await (supabase.from("notifications" as never) as unknown as {
        select: (
          s: string,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => { limit: (n: number) => Promise<{ data: NotificationRow[] | null }> };
        };
      })
        .select("id, kind, title, body, event_id, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  async function markAllRead() {
    const ids = (notifications ?? []).filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await (supabase.from("notifications" as never) as unknown as {
      update: (v: Record<string, unknown>) => {
        in: (col: string, ids: string[]) => Promise<unknown>;
      };
    })
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
  }

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;


  return (
    <DashboardShell role="participant">
      {isOverview ? (
        <>
          <PageHeader
            title="Your events"
            subtitle="Registrations, announcements, and submissions."
          />
          <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
            {isLoading ? (
              <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-card" />
            ) : (regs ?? []).length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="You haven't registered for any events"
                description="Open an event's website and click Register to get started."
              />
            ) : (
              <div className="grid gap-6">
                {regs!.map((r) => {
                  const e = r.events;
                  const mySub = (subs ?? []).find((s) => s.event_id === r.event_id);
                  if (!e) return null;
                  return (
                    <Card key={r.id} className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="text-xl font-bold">{e.name}</h3>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {e.start_date} → {e.end_date}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">{r.status}</Badge>
                            {mySub && <Badge variant="outline" className="capitalize">{mySub.status}</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-3 pt-2">
                            <Link to={`/dashboard/participant/events/${r.event_id}/info`}>
                              <Button size="sm" variant="outline">Event Workspace</Button>
                            </Link>
                            <Link to={`/dashboard/participant/events/${r.event_id}/submissions`}>
                              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                {mySub ? "Edit submission" : "Submit project"}
                              </Button>
                            </Link>
                          </div>
                        </div>
                        
                        <div className="w-full md:w-64 shrink-0 rounded-xl border border-border/60 bg-surface/30 p-4">
                          <h4 className="text-sm font-semibold mb-3">Team Setup</h4>
                          <Link to={`/dashboard/participant/events/${r.event_id}/team`}>
                            <Button size="sm" variant="secondary" className="w-full">
                              <Users className="mr-2 h-4 w-4" /> Manage Team
                            </Button>
                          </Link>
                          <p className="mt-4 text-xs text-muted-foreground">Invite members or view your current team status.</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {(regs ?? []).length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4" /> Schedule & Deadlines
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {regs!.map((r) => {
                    const e = r.events;
                    if (!e) return null;
                    return (
                      <Card key={`timeline-${e.id}`} className="p-5">
                        <h3 className="mb-4 text-sm font-semibold">{e.name} Timeline</h3>
                        <div className="relative border-l border-brand/30 ml-3 space-y-6">
                          <div className="relative pl-6">
                            <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-background"></div>
                            <div className="text-sm font-medium">Event Starts</div>
                            <div className="text-xs text-muted-foreground">{e.start_date || "TBD"}</div>
                          </div>
                          <div className="relative pl-6">
                            <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand/40 ring-4 ring-background"></div>
                            <div className="text-sm font-medium">Project Submission Deadline</div>
                            <div className="text-xs text-muted-foreground">{e.end_date || "TBD"}</div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}


            {(notifications ?? []).length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Bell className="h-4 w-4" /> Notifications
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-1">{unreadCount} new</Badge>
                    )}
                  </h2>
                  {unreadCount > 0 && (
                    <Button size="sm" variant="ghost" onClick={markAllRead}>
                      <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {notifications!.map((n) => (
                    <Card
                      key={n.id}
                      className={`p-4 ${!n.read_at ? "border-primary/40 bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold">{n.title}</h4>
                          {n.body && (
                            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                          )}
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!n.read_at && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {(announcements ?? []).length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Megaphone className="h-4 w-4" /> Latest announcements
                </h2>
                <div className="space-y-3">
                  {announcements!.map((a) => (
                    <Card key={a.id} className="p-4">
                      <div className="flex items-start gap-2">
                        {a.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold">{a.title}</h4>
                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              {a.events?.name}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                            {a.body}
                          </p>
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
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
