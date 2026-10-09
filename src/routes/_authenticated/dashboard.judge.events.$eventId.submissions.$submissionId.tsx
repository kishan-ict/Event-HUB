import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveSubmissionScore, getSignedSubmissionUrl } from "@/lib/scores.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2, Save, Minus, Plus } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/judge/events/$eventId/submissions/$submissionId",
)({
  head: () => ({ meta: [{ title: "Score submission — EVENT-HUB" }] }),
  component: ScoreSubmission,
});

function ScoreSubmission() {
  const { eventId, submissionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = saveSubmissionScore;
  const sign = getSignedSubmissionUrl;

  const { data: event } = useQuery({
    queryKey: ["judge-event", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name")
        .eq("id", eventId)
        .maybeSingle();
      return data;
    },
  });

  const { data: submission, isLoading } = useQuery({
    queryKey: ["judge-submission", submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: criteria } = useQuery({
    queryKey: ["criteria", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("judging_criteria")
        .select("*")
        .eq("event_id", eventId)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["my-score", submissionId],
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) return null;
      const { data } = await supabase
        .from("submission_scores")
        .select("*")
        .eq("submission_id", submissionId)
        .eq("judge_id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setScores(
        (existing.criteria_scores as Record<string, number>) ?? {},
      );
      setFeedback(existing.feedback ?? "");
    }
  }, [existing]);

  async function openFile() {
    try {
      const res = await sign({ data: { submissionId } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open file");
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      // Fill missing criteria with 0
      const filled: Record<string, number> = {};
      for (const c of criteria ?? []) {
        const v = Number(scores[c.id] ?? 0);
        if (v < 0 || v > c.max_score) {
          throw new Error(`${c.name} must be between 0 and ${c.max_score}`);
        }
        filled[c.id] = v;
      }
      const res = await save({
        data: {
          eventId,
          submissionId,
          criteriaScores: filled,
          feedback: feedback.trim() || null,
        },
      });
      toast.success(`Score saved (${res.totalScore})`);
      qc.invalidateQueries({ queryKey: ["my-score", submissionId] });
      qc.invalidateQueries({ queryKey: ["judge-submissions"] });
      navigate({ to: "/dashboard/judge" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!submission) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Submission not found</h1>
          <Link to="/dashboard/judge" className="mt-3 inline-block text-sm underline">
            Back to judging
          </Link>
        </div>
      </div>
    );
  }

  const total = (criteria ?? []).reduce(
    (a, c) => a + Number(scores[c.id] ?? 0),
    0,
  );
  const maxTotal = (criteria ?? []).reduce((a, c) => a + Number(c.max_score), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <Link
          to="/dashboard/judge"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{event?.name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Score submission
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold">{submission.title}</h1>
              {submission.category && (
                <Badge variant="secondary" className="mt-2">{submission.category}</Badge>
              )}
              {submission.description && (
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {submission.description}
                </p>
              )}
            </div>
            {submission.file_path && (
              <Button size="sm" variant="outline" onClick={openFile}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Open file
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your scores</h2>
            <div className="font-mono text-xs text-muted-foreground">
              Total: <span className="text-foreground">{total}</span> / {maxTotal}
            </div>
          </div>

          {(criteria ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No judging criteria have been configured for this event yet.
            </p>
          ) : (
            <div className="space-y-4">
              {criteria!.map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`c-${c.id}`}>
                      {c.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (max {c.max_score})
                      </span>
                    </Label>
                    <span className="font-mono text-xs">
                      {scores[c.id] ?? 0}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-12 w-12 shrink-0 rounded-full border-border/60"
                      onClick={() => setScores(s => ({...s, [c.id]: Math.max(0, (s[c.id] || 0) - 1)}))}
                      disabled={(scores[c.id] || 0) <= 0}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                      <Input
                        id={`c-${c.id}`}
                        type="number"
                        min={0}
                        max={c.max_score}
                        value={scores[c.id] ?? 0}
                        onChange={(e) =>
                          setScores((s) => ({
                            ...s,
                            [c.id]: Math.max(
                              0,
                              Math.min(c.max_score, Number(e.target.value) || 0),
                            ),
                          }))
                        }
                        className="h-14 text-center text-xl font-bold rounded-xl border-border/60 bg-surface/50"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-12 w-12 shrink-0 rounded-full border-border/60"
                      onClick={() => setScores(s => ({...s, [c.id]: Math.min(c.max_score, (s[c.id] || 0) + 1)}))}
                      disabled={(scores[c.id] || 0) >= c.max_score}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-2">
            <Label htmlFor="feedback">Feedback (optional)</Label>
            <Textarea
              id="feedback"
              rows={4}
              maxLength={5000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Comments visible to the host and participant."
            />
          </div>

          <div className="mt-8">
            <Button 
              className="w-full h-14 text-lg bg-brand text-brand-foreground hover:bg-brand/90 rounded-xl font-semibold shadow-md"
              onClick={onSave} 
              disabled={saving || (criteria ?? []).length === 0}
            >
              {saving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              Submit Scores
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
