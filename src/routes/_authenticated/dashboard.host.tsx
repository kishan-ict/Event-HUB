import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DashboardShell,
  PageHeader,
  StatCard,
  EmptyState,
} from "@/components/dashboard-shell";
import { Calendar, Plus, Users, UserCheck, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const Route = createFileRoute("/_authenticated/dashboard/host")({
  head: () => ({ meta: [{ title: "Host dashboard — EVENT-HUB" }] }),
  component: HostDashboard,
});

function HostDashboard() {
  const matchRoute = useMatchRoute();
  const isOverview = matchRoute({ to: "/dashboard/host", fuzzy: false });

  const { data: events, isLoading } = useQuery({
    queryKey: ["host-events"],
    queryFn: async () => {
      const { data: user } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!user.user) return [];
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("host_id", user.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = events?.length ?? 0;
  const published = events?.filter((e) => e.is_published).length ?? 0;

  return (
    <DashboardShell role="host">
      {!isLoading && total === 0 && <HostOnboardingModal />}
      {isOverview ? (
        <>
          <PageHeader
            title="Overview"
            subtitle="Manage your events, participants, and judging."
            action={
              <Link to="/events/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New event
                </Button>
              </Link>
            }
          />
          <div className="mx-auto max-w-6xl px-6 py-8">
            
            {/* Banner Section */}
            {events && events.length > 0 && (
              <div className="mb-8 rounded-2xl bg-hero border border-border/60 p-8 shadow-glow text-white relative overflow-hidden">
                <div className="relative z-10">
                  <span className="inline-block rounded bg-white/20 px-2 py-1 text-[10px] uppercase tracking-widest font-mono backdrop-blur">
                    {events[0].is_published ? "Live" : "Draft"}
                  </span>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight">{events[0].name}</h2>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
                    <Calendar className="h-4 w-4" />
                    {events[0].start_date} — {events[0].end_date}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Registrations"
                value={total}
                icon={<div className="text-[#a855f7]"><Users className="h-4 w-4" /></div>}
              />
              <StatCard
                label="Pending Approvals"
                value={0}
                hint="Coming soon"
                icon={<div className="text-orange-500"><UserCheck className="h-4 w-4" /></div>}
              />
              <StatCard
                label="Approved"
                value={published}
                icon={<div className="text-green-500"><ShieldCheck className="h-4 w-4" /></div>}
              />
              <StatCard
                label="Total Teams"
                value={0}
                hint="Coming soon"
                icon={<div className="text-[#a855f7]"><UsersRound className="h-4 w-4" /></div>}
              />
            </div>

            <div className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Your events</h2>
                  <p className="text-sm text-muted-foreground">
                    Every event you're hosting.
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-xl border border-border/60 bg-card"
                    />
                  ))}
                </div>
              ) : total === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No events yet"
                  description="Create your first event to get started with registrations and judging, or read the host guide to get up to speed."
                >
                  <div className="flex items-center gap-3">
                    <Link to="/events/create">
                      <Button id="btn-create-first-event">Create your first event</Button>
                    </Link>
                    <Link to="/dashboard/host/guide">
                      <Button variant="outline">Read the Host Guide</Button>
                    </Link>
                  </div>
                </EmptyState>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {events!.map((e) => (
                    <Card
                      key={e.id}
                      className="group relative overflow-hidden border-border/60 bg-card p-5 transition-colors hover:border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold">{e.name}</h3>
                          <p className="font-mono text-xs text-muted-foreground">
                            /{e.slug}
                          </p>
                        </div>
                        <Badge
                          variant={e.is_published ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {e.is_published ? "Live" : "Draft"}
                        </Badge>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {e.start_date} → {e.end_date}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link to="/dashboard/host/events/$id" params={{ id: e.id }} className="col-span-2">
                          <Button size="sm" variant="default" className="w-full">Event Overview & Publish</Button>
                        </Link>
                        <Link to="/dashboard/host/events/$id/website" params={{ id: e.id }}>
                          <Button size="sm" variant="outline" className="w-full">Website</Button>
                        </Link>
                        <Link to="/dashboard/host/events/$id/form" params={{ id: e.id }}>
                          <Button size="sm" variant="outline" className="w-full">Form</Button>
                        </Link>
                        <Link to="/dashboard/host/events/$id/announcements" params={{ id: e.id }}>
                          <Button size="sm" variant="outline" className="w-full">Announcements</Button>
                        </Link>
                        <Link to="/dashboard/host/events/$id/judges" params={{ id: e.id }}>
                          <Button size="sm" variant="outline" className="w-full">Judges</Button>
                        </Link>
                        <Link to="/dashboard/host/events/$id/analytics" params={{ id: e.id }}>
                          <Button size="sm" variant="outline" className="w-full">Analytics</Button>
                        </Link>
                        <Link to="/dashboard/host/events/$id/scores" params={{ id: e.id }}>
                          <Button size="sm" variant="outline" className="w-full">Scores</Button>
                        </Link>
                      </div>
                      {e.is_published && (
                        <a
                          href={`https://event-aleropath.pages.dev/event/${e.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                        >
                          View public page →
                        </a>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </DashboardShell>
  );
}

function HostOnboardingModal() {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const fullText = "Hi there! I am here to guide you through the process of creating your first event and making it public.";
  
  useEffect(() => {
    const tourKey = "host-global-tour-seen";
    if (!localStorage.getItem(tourKey)) {
      setShow(true);
      let i = 0;
      const interval = setInterval(() => {
        setText(fullText.substring(0, i));
        i++;
        if (i > fullText.length) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }
  }, []);

  if (!show) return null;

  const handleNoNeed = () => {
    localStorage.setItem("host-global-tour-seen", "true");
    setShow(false);
    toast.success("No worries! Just remember to complete the 3 steps (Website, Schedule, Form) to make your event live.");
  };

  const handleLetsGo = () => {
    localStorage.setItem("host-global-tour-seen", "true");
    setShow(false);
    
    setTimeout(() => {
      const driverObj = driver({
        showProgress: false,
        animate: true,
        steps: [
          { 
            element: '#btn-create-first-event', 
            popover: { 
              title: 'Create Your First Event 🎉', 
              description: 'Click this button to give your event a catchy name and start the setup process!', 
              side: "bottom", 
              align: 'center' 
            } 
          }
        ]
      });
      driverObj.drive();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="max-w-3xl text-center space-y-8 p-6">
        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight min-h-[100px]">
          {text}
          <span className="animate-pulse ml-1 inline-block w-3 h-10 md:h-12 bg-brand align-middle"></span>
        </h2>
        
        {text.length >= fullText.length && (
          <div className="flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button size="lg" variant="outline" className="text-white border-white/20 bg-black/40 hover:bg-white/10" onClick={handleNoNeed}>
              No Need
            </Button>
            <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90 px-8 shadow-xl shadow-brand/20" onClick={handleLetsGo}>
              Let's Go!
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
