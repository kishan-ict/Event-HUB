DROP POLICY IF EXISTS "Hosts create events" ON public.events;

CREATE POLICY "Hosts create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = host_id
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'host'::public.app_role
  )
);