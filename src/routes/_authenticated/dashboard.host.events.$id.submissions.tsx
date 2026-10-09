import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { EmptyState } from "@/components/dashboard-shell";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/submissions",
)({
  head: () => ({ meta: [{ title: "Submissions — EVENT-HUB" }] }),
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const { id } = Route.useParams();

  const { data: event } = useQuery({
    queryKey: ["event-submissions-meta", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["event-all-submissions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, title, status, created_at, category")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const subs = submissions ?? [];

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
            Submissions
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
            <p className="text-sm text-muted-foreground mt-1">View project submissions for your event.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        ) : subs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No submissions yet"
            description="When participants submit their projects, they will appear here."
          />
        ) : (
          <Card className="divide-y divide-border/60">
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {s.title || "Untitled Project"}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    #{s.id.slice(0, 8)} · {new Date(s.created_at).toLocaleString()}
                    {s.category && ` · ${s.category}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === 'scored' ? 'bg-green-500/10 text-green-500' :
                    s.status === 'under_review' ? 'bg-orange-500/10 text-orange-500' :
                    s.status === 'draft' ? 'bg-secondary text-secondary-foreground' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </main>
    </div>
  );
}
