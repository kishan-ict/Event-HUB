
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;

CREATE POLICY "Hosts insert notifications for their events" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.host_id = auth.uid()
    )
  );
