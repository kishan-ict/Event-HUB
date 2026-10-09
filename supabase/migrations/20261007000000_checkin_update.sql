-- Add capacity to events
ALTER TABLE public.events ADD COLUMN capacity integer DEFAULT null;

-- Create attenders table
CREATE TABLE public.attenders (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS for attenders
ALTER TABLE public.attenders ENABLE ROW LEVEL SECURITY;

-- Hosts can read and create attenders for their events
CREATE POLICY "Hosts can manage their attenders" 
ON public.attenders FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = attenders.event_id AND e.host_id = auth.uid())
);

-- Attenders can read their own row
CREATE POLICY "Attenders can view own profile" 
ON public.attenders FOR SELECT TO authenticated 
USING (id = auth.uid());

-- Add check-in fields to registrations
ALTER TABLE public.registrations ADD COLUMN check_in_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8);
ALTER TABLE public.registrations ADD COLUMN checked_in_at timestamptz DEFAULT null;
ALTER TABLE public.registrations ADD COLUMN checked_in_by uuid REFERENCES public.attenders(id) ON DELETE SET NULL;
ALTER TABLE public.registrations ADD COLUMN attendance_status text DEFAULT 'pending';

-- Attenders need to be able to read and update registrations for their event
CREATE POLICY "Attenders can view event registrations"
ON public.registrations FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.attenders a WHERE a.event_id = registrations.event_id AND a.id = auth.uid())
);

CREATE POLICY "Attenders can update event registrations"
ON public.registrations FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.attenders a WHERE a.event_id = registrations.event_id AND a.id = auth.uid())
);
