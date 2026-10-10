-- Fix infinite recursion in team_members policies

-- 1. Drop recursive policies
DROP POLICY IF EXISTS "Users can view members of their team" ON public.team_members;
DROP POLICY IF EXISTS "Team leaders can manage members" ON public.team_members;

-- 2. Create a secure function to check if a user is a team leader without triggering RLS
CREATE OR REPLACE FUNCTION public.is_team_leader(_team_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = _team_id 
        AND user_id = _user_id 
        AND role = 'leader'
    );
$$;

-- 3. Create a secure function to check if a user is in a team without triggering RLS
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = _team_id 
        AND user_id = _user_id
    );
$$;

-- 4. Re-create the SELECT policy using the function (or just let them see all event members)
-- We will allow users to see team members if they are in the team, using the secure function
CREATE POLICY "Users can view members of their team" ON public.team_members FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_team_member(team_members.team_id, auth.uid())
    );

-- 5. Re-create the Team leaders policy using the secure function
CREATE POLICY "Team leaders can manage members" ON public.team_members FOR ALL
    USING (public.is_team_leader(team_members.team_id, auth.uid()));

-- Also ensure that when creating a team, the user can insert THEMSELVES as leader.
-- The ALL policy allows it if they are already leader, but they aren't leader until they insert!
-- So we need a policy for users inserting themselves as leader when creating a team.
-- Oh wait, in supabase, if you insert a row, the USING policy applies to the row being inserted.
-- But wait, public.is_team_leader(team_id, uid) will return false BEFORE the insert happens!
-- So an INSERT policy needs to allow the initial creator.
-- Let's add a specific INSERT policy for creating a team (or joining).

DROP POLICY IF EXISTS "Users can insert themselves" ON public.team_members;
CREATE POLICY "Users can insert themselves" ON public.team_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);
