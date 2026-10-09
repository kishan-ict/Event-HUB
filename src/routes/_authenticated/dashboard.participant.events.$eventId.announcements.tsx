import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Megaphone, Pin } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/participant/events/$eventId/announcements"
)({
  head: () => ({ meta: [{ title: "Announcements — EVENT-HUB" }] }),
  component: ParticipantAnnouncements,
});

function ParticipantAnnouncements() {
  const { eventId } = Route.useParams();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["participant-announcements", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("event_id", eventId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="p-8 animate-pulse bg-surface h-32 rounded-xl" />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>

      {announcements?.length === 0 ? (
        <Card className="p-16 text-center bg-surface/30 border-dashed">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No announcements yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The event host hasn't posted any announcements.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements?.map(a => (
            <Card key={a.id} className="p-6">
              <div className="flex items-start gap-3">
                {a.pinned && <Pin className="mt-1 h-4 w-4 text-brand shrink-0" />}
                <div>
                  <h3 className="font-semibold text-lg">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                  <p className="mt-4 text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
