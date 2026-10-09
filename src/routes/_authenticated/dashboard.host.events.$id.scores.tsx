import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/scores",
)({
  head: () => ({ meta: [{ title: "Scores & leaderboard — EVENT-HUB" }] }),
  component: ScoresPage,
});

type SubRow = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  user_id: string;
};

function ScoresPage() {
  const { id } = Route.useParams();

  const { data: event } = useQuery({
    queryKey: ["event-scores-info", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name, categories")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["event-submissions", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, title, category, status, user_id")
        .eq("event_id", id)
        .neq("status", "draft");
      return (data ?? []) as SubRow[];
    },
  });

  const { data: scores } = useQuery({
    queryKey: ["event-scores", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("submission_scores")
        .select("submission_id, judge_id, total_score, feedback, updated_at")
        .eq("event_id", id);
      return data ?? [];
    },
  });

  const bySubmission = new Map<
    string,
    { totals: number[]; feedback: string[]; judges: number }
  >();
  for (const s of scores ?? []) {
    const entry = bySubmission.get(s.submission_id) ?? {
      totals: [],
      feedback: [],
      judges: 0,
    };
    entry.totals.push(Number(s.total_score));
    if (s.feedback) entry.feedback.push(s.feedback);
    entry.judges += 1;
    bySubmission.set(s.submission_id, entry);
  }

  const ranked = (submissions ?? [])
    .map((s) => {
      const agg = bySubmission.get(s.id);
      const avg =
        agg && agg.totals.length > 0
          ? agg.totals.reduce((a, b) => a + b, 0) / agg.totals.length
          : null;
      return { ...s, avg, judges: agg?.judges ?? 0, feedback: agg?.feedback ?? [] };
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <Link
          to="/dashboard/host"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{event?.name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Scores & leaderboard
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <Card className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-500/10">
              <Trophy className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Live Leaderboard</h2>
              <p className="text-sm text-muted-foreground">Real-time rankings based on judge scores.</p>
            </div>
          </div>
          {ranked.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-16 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
                <Trophy className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">No scores submitted yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Rankings will appear here once judges start evaluating submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranked.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-surface/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 font-mono text-xs text-muted-foreground">
                        #{i + 1}
                      </span>
                      <span className="truncate font-medium">{r.title}</span>
                      {r.category && (
                        <Badge variant="secondary" className="shrink-0">
                          {r.category}
                        </Badge>
                      )}
                    </div>
                    {r.feedback.length > 0 && (
                      <ul className="mt-2 space-y-1 pl-8 text-xs text-muted-foreground">
                        {r.feedback.slice(0, 3).map((f, j) => (
                          <li key={j} className="line-clamp-2">“{f}”</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold">
                      {r.avg == null ? "—" : r.avg.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.judges} {r.judges === 1 ? "judge" : "judges"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </Card>
      </main>
    </div>
  );
}
