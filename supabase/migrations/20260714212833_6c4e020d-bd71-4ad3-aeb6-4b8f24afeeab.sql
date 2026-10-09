
-- Categories on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads announcements for published events"
  ON public.announcements FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_published = true));

CREATE POLICY "Hosts read own event announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE POLICY "Hosts insert announcements"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid())
  );

CREATE POLICY "Hosts update announcements"
  ON public.announcements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE POLICY "Hosts delete announcements"
  ON public.announcements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE TRIGGER set_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Judging criteria
CREATE TABLE IF NOT EXISTS public.judging_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  max_score integer NOT NULL DEFAULT 10 CHECK (max_score > 0 AND max_score <= 1000),
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.judging_criteria TO authenticated;
GRANT ALL ON public.judging_criteria TO service_role;
ALTER TABLE public.judging_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in reads criteria for their event access"
  ON public.judging_criteria FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id
      AND (e.host_id = auth.uid() OR e.is_published = true))
  );

CREATE POLICY "Hosts manage criteria"
  ON public.judging_criteria FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE TRIGGER set_judging_criteria_updated_at
  BEFORE UPDATE ON public.judging_criteria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Judge assignments
CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, judge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.judge_assignments TO authenticated;
GRANT ALL ON public.judge_assignments TO service_role;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts manage judge assignments"
  ON public.judge_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE POLICY "Judges view own assignments"
  ON public.judge_assignments FOR SELECT TO authenticated
  USING (auth.uid() = judge_id);

-- Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  file_path text,
  file_name text,
  file_size bigint,
  file_type text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','scored')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants manage own submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts view event submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE POLICY "Assigned judges view event submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.judge_assignments ja WHERE ja.event_id = submissions.event_id AND ja.judge_id = auth.uid()));

CREATE POLICY "Participants insert own submission"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.registrations r WHERE r.event_id = event_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Participants update own draft"
  ON public.submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('draft','submitted'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts update submission status"
  ON public.submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.host_id = auth.uid()));

CREATE POLICY "Participants delete own draft"
  ON public.submissions FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

CREATE TRIGGER set_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
