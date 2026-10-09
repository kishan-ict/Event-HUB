
CREATE TABLE public.submission_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score NUMERIC NOT NULL DEFAULT 0,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, judge_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_scores TO authenticated;
GRANT ALL ON public.submission_scores TO service_role;

ALTER TABLE public.submission_scores ENABLE ROW LEVEL SECURITY;

-- Judges can view and manage their own scores for events they are assigned to
CREATE POLICY "Judges view own scores"
  ON public.submission_scores FOR SELECT TO authenticated
  USING (
    judge_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = submission_scores.event_id AND e.host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_scores.submission_id AND s.user_id = auth.uid() AND s.status = 'scored')
  );

CREATE POLICY "Judges insert own scores"
  ON public.submission_scores FOR INSERT TO authenticated
  WITH CHECK (
    judge_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.judge_assignments ja
      WHERE ja.event_id = submission_scores.event_id AND ja.judge_id = auth.uid()
    )
  );

CREATE POLICY "Judges update own scores"
  ON public.submission_scores FOR UPDATE TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (judge_id = auth.uid());

CREATE POLICY "Judges delete own scores"
  ON public.submission_scores FOR DELETE TO authenticated
  USING (judge_id = auth.uid());

CREATE TRIGGER submission_scores_updated_at
  BEFORE UPDATE ON public.submission_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX submission_scores_event_idx ON public.submission_scores(event_id);
CREATE INDEX submission_scores_submission_idx ON public.submission_scores(submission_id);
