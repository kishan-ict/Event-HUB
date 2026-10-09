
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Hosts update registrations for their events" ON public.registrations;
CREATE POLICY "Hosts update registrations for their events"
ON public.registrations
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = registrations.event_id AND e.host_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = registrations.event_id AND e.host_id = auth.uid()));
