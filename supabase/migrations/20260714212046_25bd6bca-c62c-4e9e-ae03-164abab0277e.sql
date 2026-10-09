
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS website_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registration_fields jsonb NOT NULL DEFAULT '[
    {"id":"name","label":"Full name","type":"text","required":true,"system":true},
    {"id":"email","label":"Email","type":"email","required":true,"system":true},
    {"id":"phone","label":"Phone","type":"tel","required":false,"system":false},
    {"id":"institution","label":"Institution / Organization","type":"text","required":false,"system":false},
    {"id":"team_name","label":"Team name","type":"text","required":false,"system":false},
    {"id":"team_size","label":"Team size","type":"number","required":false,"system":false}
  ]'::jsonb;

CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view own registrations"
  ON public.registrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts view registrations for their events"
  ON public.registrations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE POLICY "Users register for published events"
  ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_published = true)
  );

CREATE POLICY "Participants update own registration"
  ON public.registrations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants delete own registration"
  ON public.registrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts delete registrations for their events"
  ON public.registrations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE TRIGGER set_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
