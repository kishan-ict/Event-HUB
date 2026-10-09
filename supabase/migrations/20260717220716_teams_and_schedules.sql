-- Migration for Teams and Schedule Timeline features

-- 1. Add Schedule Timeline and Onboarding status to Events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS schedule_timeline JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 2. Create Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Host can do anything with teams in their event
CREATE POLICY "Hosts can manage teams in their events" ON public.teams
    USING (EXISTS (SELECT 1 FROM public.events WHERE events.id = teams.event_id AND events.host_id = auth.uid()));

-- Participants can see teams for their event
CREATE POLICY "Participants can view teams for events they are registered in" ON public.teams FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.registrations WHERE registrations.event_id = teams.event_id AND registrations.user_id = auth.uid()));

-- Participants can create teams
CREATE POLICY "Participants can create teams" ON public.teams FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.registrations WHERE registrations.event_id = teams.event_id AND registrations.user_id = auth.uid()));

-- 3. Create Team Members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Host can manage team members
CREATE POLICY "Hosts can manage team members" ON public.team_members
    USING (EXISTS (
        SELECT 1 FROM public.teams 
        JOIN public.events ON events.id = teams.event_id
        WHERE teams.id = team_members.team_id AND events.host_id = auth.uid()
    ));

-- Users can view members of their team
CREATE POLICY "Users can view members of their team" ON public.team_members FOR SELECT
    USING (
        -- Either they are the user
        auth.uid() = user_id
        OR 
        -- Or they are in the same team
        EXISTS (SELECT 1 FROM public.team_members tm2 WHERE tm2.team_id = team_members.team_id AND tm2.user_id = auth.uid())
    );

-- Team leaders can add/manage members
CREATE POLICY "Team leaders can manage members" ON public.team_members FOR ALL
    USING (EXISTS (SELECT 1 FROM public.team_members tm2 WHERE tm2.team_id = team_members.team_id AND tm2.user_id = auth.uid() AND tm2.role = 'leader'));

-- Users can accept/decline invites
CREATE POLICY "Users can update their own status" ON public.team_members FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can leave/decline invites" ON public.team_members FOR DELETE
    USING (auth.uid() = user_id);

-- Realtime replication for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
