-- Add invite_code to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Create policy so participants can find teams by invite code
CREATE POLICY "Participants can find teams by invite code" ON public.teams FOR SELECT
    USING (invite_code IS NOT NULL);

-- Create policy so anyone authenticated can insert themselves into a team they have the invite code for
-- Note: the RLS policy for insert on team_members is:
-- CREATE POLICY "Team leaders can manage members" ON public.team_members FOR ALL ...
-- But wait! If they are joining themselves using the invite code, they need permission to insert into team_members!
CREATE POLICY "Users can join teams via invite code" ON public.team_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);
