import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Calendar, LayoutTemplate, ClipboardList, CheckCircle2, Circle, Megaphone, Copy, ExternalLink, QrCode } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/"
)({
  head: () => ({ meta: [{ title: "Event Overview — EVENT-HUB" }] }),
  component: EventOverviewAdmin,
});

function EventOverviewAdmin() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [publishing, setPublishing] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["event-overview", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const { count: regCount } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id);
        
      const { count: checkedInCount } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("attendance_status", "present");

      return { ...data, stats: { registrations: regCount || 0, checkedIn: checkedInCount || 0 } };
    },
  });

  if (!event) return null;

  const hasForm = Object.keys(event.registration_fields || {}).length > 0;
  const hasWebsite = Array.isArray(event.website_blocks) && event.website_blocks.length > 0;
  const hasSchedule = Array.isArray(event.schedule_timeline) && event.schedule_timeline.length > 0;

  // The checklist requires schedule to be set
  const canPublish = hasSchedule;

  async function togglePublish(next: boolean) {
    if (next && !canPublish) {
      toast.error("Please complete the required setup tasks before publishing.");
      return;
    }
    setPublishing(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_published: next, onboarding_completed: true } as never)
        .eq("id", id);
      if (error) throw error;
      toast.success(next ? "Event is now live!" : "Event unpublished.");
      qc.invalidateQueries({ queryKey: ["event-overview", id] });
      qc.invalidateQueries({ queryKey: ["host-events"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update publish status");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <Link
          to="/dashboard/host"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all events
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground font-mono">/{event.slug}</p>
          </div>
          <div className="flex items-center gap-4">
            <a href={`https://event-aleropath.pages.dev/event/${event.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View public page</Button>
            </a>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2 px-3">
              <span className="text-sm font-medium">{event.is_published ? "Live" : "Draft"}</span>
              <Switch checked={event.is_published} onCheckedChange={togglePublish} disabled={publishing} />
            </div>
          </div>
        </div>

        {!event.onboarding_completed && !event.is_published && (
          <Card className="border-brand/30 bg-brand/5 p-6">
            <h2 className="text-lg font-semibold mb-2">Pre-Publish Checklist</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Complete these steps to set up your event. You must configure the Schedule & Deadlines before you can publish your event online.
            </p>
            <div className="space-y-4">
              <ChecklistItem 
                title="Create Registration Form (Optional)" 
                description="Customize the fields participants need to fill out." 
                done={hasForm} 
                href={`/dashboard/host/events/${id}/form`} 
                icon={ClipboardList} 
              />
              <ChecklistItem 
                title="Customize Website (Optional)" 
                description="Build a landing page for your event." 
                done={hasWebsite} 
                href={`/dashboard/host/events/${id}/website`} 
                icon={LayoutTemplate} 
              />
              <ChecklistItem 
                title="Set Schedule & Deadlines (Required)" 
                description="Define the timeline so participants know when projects are due." 
                done={hasSchedule} 
                href={`/dashboard/host/events/${id}/schedule`} 
                icon={Calendar} 
              />
            </div>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MenuCard title="Website Builder" icon={LayoutTemplate} href={`/dashboard/host/events/${id}/website`} />
          <MenuCard title="Registration Form" icon={ClipboardList} href={`/dashboard/host/events/${id}/form`} />
          <MenuCard title="Schedule & Deadlines" icon={Calendar} href={`/dashboard/host/events/${id}/schedule`} />
          <MenuCard title="Announcements" icon={Megaphone} href={`/dashboard/host/events/${id}/announcements`} />
          <MenuCard title="Registrations" icon={LayoutTemplate} href={`/dashboard/host/events/${id}/registrations`} />
          <MenuCard title="Manage Attenders" icon={QrCode} href={`/dashboard/host/events/${id}/attenders`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Registrations</h3>
            <div className="text-4xl font-bold">{event.stats?.registrations}</div>
            {event.capacity && (
              <p className="text-sm text-muted-foreground mt-2">Maximum capacity: {event.capacity}</p>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Checked In</h3>
            <div className="text-4xl font-bold text-emerald-600">{event.stats?.checkedIn}</div>
            <p className="text-sm text-muted-foreground mt-2">
              {event.stats?.registrations > 0 ? Math.round((event.stats?.checkedIn / event.stats?.registrations) * 100) : 0}% of registered
            </p>
          </Card>
        </div>

        <div className="space-y-4 pt-6 border-t border-border/40">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Participant Portal Links</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Quick links to the participant workspace pages. Share these with registered users or test them yourself!
            </p>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LinkShareCard 
              title="Registration Portal" 
              description="Where new participants can sign up for this event." 
              url={`${window.location.origin}/events/${event.slug}/register`} 
            />
            <LinkShareCard 
              title="Workspace Info" 
              description="General dashboard info and workspace for this event." 
              url={`${window.location.origin}/dashboard/participant/events/${event.id}/info`} 
            />
            <LinkShareCard 
              title="Official Announcements" 
              description="View live updates, pinned alerts, and event notifications." 
              url={`${window.location.origin}/dashboard/participant/events/${event.id}/announcements`} 
            />
            <LinkShareCard 
              title="Team Setup & Invites" 
              description="Manage team formation, join teams, and invite members." 
              url={`${window.location.origin}/dashboard/participant/events/${event.id}/team`} 
            />
            <LinkShareCard 
              title="Project Submission" 
              description="Where team members submit final code, slides, or links." 
              url={`${window.location.origin}/dashboard/participant/events/${event.id}/submissions`} 
            />
            <LinkShareCard 
              title="Schedule & Timeline" 
              description="Read and check compulsory timeline milestones." 
              url={`${window.location.origin}/dashboard/participant/events/${event.id}/schedule`} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function ChecklistItem({ title, description, done, href, icon: Icon }: any) {
  return (
    <div className="flex items-start gap-3">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <h3 className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Link to={href as any}>
        <Button variant="outline" size="sm">Edit</Button>
      </Link>
    </div>
  );
}

function MenuCard({ title, icon: Icon, href }: any) {
  return (
    <Link to={href as any} className="block">
      <Card className="p-5 hover:border-foreground/30 transition-colors h-full flex flex-col items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-semibold text-sm">{title}</div>
      </Card>
    </Link>
  );
}

function LinkShareCard({ title, description, url }: { title: string; description: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`${title} link copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className="p-5 flex flex-col justify-between gap-4">
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-2 leading-relaxed">{description}</p>
        <div className="rounded bg-muted/50 p-2 font-mono text-[10px] break-all select-all text-muted-foreground border border-border/40">
          {url}
        </div>
      </div>
      <div className="flex gap-2 w-full mt-auto">
        <Button onClick={copyLink} size="sm" variant="outline" className="flex-1">
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button size="sm" className="w-full">
            Visit
          </Button>
        </a>
      </div>
    </Card>
  );
}
