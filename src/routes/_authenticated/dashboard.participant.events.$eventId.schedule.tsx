import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/participant/events/$eventId/schedule"
)({
  head: () => ({ meta: [{ title: "Schedule — EVENT-HUB" }] }),
  component: ParticipantSchedule,
});

type TimelineBlock = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
};

function ParticipantSchedule() {
  const { eventId } = Route.useParams();

  const { data: event, isLoading } = useQuery({
    queryKey: ["participant-schedule", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("schedule_timeline, start_date, end_date")
        .eq("id", eventId)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="p-8 animate-pulse bg-surface h-32 rounded-xl" />;

  const schedule = (event?.schedule_timeline || []) as TimelineBlock[];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Schedule & Deadlines</h1>

      {schedule.length === 0 ? (
        <Card className="p-16 text-center bg-surface/30 border-dashed">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No schedule posted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The event host hasn't posted a detailed schedule yet.
          </p>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="relative border-l-2 border-brand/30 ml-4 space-y-10">
            {schedule.map((block, idx) => (
              <div key={block.id} className="relative pl-8">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-brand ring-4 ring-background"></div>
                <h3 className="font-semibold text-lg">{block.title}</h3>
                <div className="text-sm font-medium text-brand mt-1">
                  {block.date}
                  {block.endDate && ` - ${block.endDate}`}
                  {block.startTime && block.endTime && ` • ${block.startTime} - ${block.endTime}`}
                  {block.startTime && !block.endTime && ` • ${block.startTime}`}
                </div>
                {block.description && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{block.description}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
