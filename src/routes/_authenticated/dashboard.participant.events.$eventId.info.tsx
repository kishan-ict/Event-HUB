import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, LayoutDashboard } from "lucide-react";
import QRCode from "react-qr-code";

export const Route = createFileRoute(
  "/_authenticated/dashboard/participant/events/$eventId/info"
)({
  head: () => ({ meta: [{ title: "Event Info — EVENT-HUB" }] }),
  component: ParticipantEventInfo,
});

function ParticipantEventInfo() {
  const { eventId } = Route.useParams();

  const { data: event, isLoading } = useQuery({
    queryKey: ["participant-event", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      return data;
    },
  });

  const { data: registration } = useQuery({
    queryKey: ["participant-registration", eventId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getSession();
      const userId = u.session?.user.id;
      if (!userId) return null;
      const { data } = await supabase
        .from("registrations")
        .select("check_in_code, attendance_status, checked_in_at")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="p-8 animate-pulse bg-surface h-32 rounded-xl" />;
  if (!event) return <div className="p-8 text-center text-muted-foreground">Event not found.</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Welcome to {event.name} Workspace</h2>
          <p className="text-muted-foreground mb-6">
            Use the sidebar to manage your team, view announcements, check the schedule, and submit your final project.
          </p>
          <div className="flex gap-4">
            <a href={`https://event-hub.pages.dev/event/${event.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View public website</Button>
            </a>
            <Link to="/dashboard/participant/events/$eventId/team" params={{ eventId }}>
              <Button>Build your Team</Button>
            </Link>
          </div>
        </Card>
        
        <Card className="p-6 bg-brand/5 border-brand/20">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4" /> Timeline
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Start</div>
              <div className="font-medium">{event.start_date || "TBD"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider">End</div>
              <div className="font-medium">{event.end_date || "TBD"}</div>
            </div>
          </div>
        </Card>
      </div>

      {registration?.check_in_code && (
        <Card className="p-6 md:col-span-3 flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0 p-4 bg-white rounded-xl shadow-sm border">
            <QRCode value={registration.check_in_code} size={150} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold">Your Event Pass</h3>
            <p className="text-muted-foreground mt-1">
              Show this QR code at the event entrance to check in.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 items-center justify-center md:justify-start">
              <div className="px-4 py-2 bg-surface rounded-lg border font-mono tracking-widest text-lg font-bold">
                {registration.check_in_code}
              </div>
              {registration.attendance_status === "present" && (
                <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-medium">
                  Checked In at {new Date(registration.checked_in_at).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
