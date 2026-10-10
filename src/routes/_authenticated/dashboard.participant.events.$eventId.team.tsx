import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Check, X, ShieldAlert } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/participant/events/$eventId/team"
)({
  head: () => ({ meta: [{ title: "Team — EVENT-HUB" }] }),
  component: ParticipantTeam,
});

function ParticipantTeam() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // 1. Get current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      return data.user;
    },
  });

  // 2. See if the user is in a team for this event
  const { data: myTeamMember, isLoading: loadingTeam } = useQuery({
    queryKey: ["my-team-member", eventId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*, teams(*)")
        .eq("user_id", user!.id)
        .eq("teams.event_id", eventId)
        .not("teams", "is", null)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error; // ignore no rows
      return data;
    },
  });

  // 3. If they are in a team, fetch all members of that team
  const { data: members } = useQuery({
    queryKey: ["team-members", myTeamMember?.team_id],
    enabled: !!myTeamMember?.team_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, user_id, role, status, created_at")
        .eq("team_id", myTeamMember!.team_id);
      
      if (!data || data.length === 0) return [];
      
      const userIds = data.map(m => m.user_id);
      const { data: regs } = await supabase
        .from("registrations")
        .select("user_id, data")
        .eq("event_id", eventId)
        .in("user_id", userIds);
        
      return data.map(m => {
        const reg = regs?.find(r => r.user_id === m.user_id);
        const regData = reg?.data as Record<string, string> | undefined;
        // Try common field names for name and email
        const name = regData?.name || regData?.full_name || regData?.first_name || `User ${m.user_id.substring(0, 6)}`;
        const email = regData?.email || "";
        return { ...m, name, email };
      });
    },
  });

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return toast.error("Team name required");
    setCreating(true);
    try {
      // Create team
      const { data: newTeam, error: teamErr } = await supabase
        .from("teams")
        .insert({ event_id: eventId, name: teamName })
        .select()
        .single();
      if (teamErr) throw teamErr;

      // Add user as leader
      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({ team_id: newTeam.id, user_id: user!.id, role: "leader", status: "accepted" });
      if (memberErr) throw memberErr;

      toast.success("Team created!");
      qc.invalidateQueries({ queryKey: ["my-team-member", eventId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setCreating(false);
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    // Since we don't have a reliable way to map email -> user_id without an edge function, 
    // for this demo we will just display a message that this requires an edge function.
    // In a real app, an edge function would look up the user by email and insert them.
    setTimeout(() => {
      toast.info("Invite sent! (Demo mode: actual email resolution requires a backend edge function)");
      setInviteEmail("");
      setInviting(false);
    }, 1000);
  }

  async function updateStatus(memberId: string, status: string) {
    const { error } = await supabase.from("team_members").update({ status } as never).eq("id", memberId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["my-team-member", eventId] });
  }

  async function leaveTeam(memberId: string) {
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success("Left team");
      qc.invalidateQueries({ queryKey: ["my-team-member", eventId] });
    }
  }

  if (loadingTeam) return <div className="p-8 animate-pulse bg-surface h-32 rounded-xl" />;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>

      {!myTeamMember ? (
        <Card className="p-8 text-center bg-surface/30 border-dashed">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">You don't have a team yet</h2>
          <p className="mt-2 text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            You can participate solo, or create a team to collaborate with others. If you were invited to a team, you will see the invitation here.
          </p>
          <form onSubmit={createTeam} className="flex max-w-sm mx-auto items-center gap-2">
            <Input 
              placeholder="Enter team name" 
              value={teamName} 
              onChange={e => setTeamName(e.target.value)} 
            />
            <Button type="submit" disabled={creating} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {creating ? "Creating..." : "Create Team"}
            </Button>
          </form>
        </Card>
      ) : myTeamMember.status === "pending" ? (
        <Card className="p-6 border-brand/50 bg-brand/5">
          <h2 className="text-lg font-semibold mb-2">Team Invitation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You have been invited to join the team <strong>{myTeamMember.teams?.name}</strong>.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => updateStatus(myTeamMember.id, "accepted")} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Check className="mr-2 h-4 w-4" /> Accept Invite
            </Button>
            <Button variant="outline" onClick={() => leaveTeam(myTeamMember.id)}>
              <X className="mr-2 h-4 w-4" /> Decline
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 md:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold">{myTeamMember.teams?.name}</h2>
                <Badge variant="outline">Your Team</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Manage your team members and invites.</p>
            </div>

            <div className="space-y-3">
              {members?.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-brand text-sm font-medium">
                      {m.user_id === user?.id ? "YOU" : m.user_id.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {m.user_id === user?.id ? "You" : m.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.email}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.role === "leader" && <Badge variant="secondary" className="text-[10px]">Leader</Badge>}
                        {m.status === "pending" && <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-500">Pending</Badge>}
                      </div>
                    </div>
                  </div>
                  {m.user_id === user?.id && m.role !== "leader" && (
                    <Button variant="ghost" size="sm" onClick={() => leaveTeam(m.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      Leave Team
                    </Button>
                  )}
                  {m.user_id === user?.id && m.role === "leader" && members.length === 1 && (
                    <Button variant="ghost" size="sm" onClick={() => leaveTeam(m.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      Delete Team
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {myTeamMember.role === "leader" && (
            <Card className="p-6 h-fit bg-surface/50 border-brand/20">
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <UserPlus className="h-4 w-4" /> Team Invite Code
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Share this 6-character code with your teammates so they can join your team.
              </p>
              <div className="flex gap-2">
                <Input 
                  value={myTeamMember.teams?.invite_code || "N/A"} 
                  readOnly
                  className="font-mono uppercase tracking-widest text-center font-bold text-lg"
                />
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(myTeamMember.teams?.invite_code || "");
                  toast.success("Code copied!");
                }}>
                  Copy
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
