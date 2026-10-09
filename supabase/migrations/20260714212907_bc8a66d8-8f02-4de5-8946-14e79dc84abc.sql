
-- Users store files in submissions/<user_id>/<event_id>/<filename>
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own submission files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own submission files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Hosts read event submission files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.events e ON e.id = s.event_id
      WHERE s.file_path = storage.objects.name AND e.host_id = auth.uid()
    )
  );

CREATE POLICY "Assigned judges read event submission files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.judge_assignments ja ON ja.event_id = s.event_id
      WHERE s.file_path = storage.objects.name AND ja.judge_id = auth.uid()
    )
  );
