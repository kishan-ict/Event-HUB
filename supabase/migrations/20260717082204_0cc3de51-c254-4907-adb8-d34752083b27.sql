DROP POLICY IF EXISTS "Participants insert own submission" ON public.submissions;
CREATE POLICY "Participants insert own submission"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.event_id = submissions.event_id AND r.user_id = auth.uid()
    )
  );