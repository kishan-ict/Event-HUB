import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase, SUPABASE_URL, SUPABASE_KEY } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { PageHeader, EmptyState } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Users, Copy, KeySquare } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/attenders"
)({
  head: () => ({ meta: [{ title: "Manage Attenders — EVENT-HUB" }] }),
  component: AttendersPage,
});

function AttendersPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; pass: string } | null>(null);

  const { data: attenders, isLoading } = useQuery({
    queryKey: ["event-attenders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attenders")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function createAttender(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    
    setLoading(true);
    try {
      const tempPassword = password.trim() ? password.trim() : Math.random().toString(36).slice(-8) + "A1!";
      
      // Create an isolated client so we don't log out the current Host
      const adminAuthClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data, error } = await adminAuthClient.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: name,
            role: "attender"
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Host not authenticated");

      // Insert into attenders table
      const { error: insertError } = await supabase
        .from("attenders")
        .insert({
          id: data.user.id,
          event_id: id,
          name,
          email,
          created_by: user.id
        } as never);

      if (insertError) throw insertError;

      setNewCredentials({ email, pass: tempPassword });
      toast.success("Attender credential generated");
      setName("");
      setEmail("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["event-attenders", id] });
    } catch (err: any) {
      console.error("Attender creation error:", err);
      toast.error(err?.message || String(err) || "Failed to create attender");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Manage Attenders"
        subtitle="Create volunteer accounts to help scan tickets and take attendance."
      />
      <div className="mx-auto max-w-4xl p-6 space-y-8">
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create Attender Credential</h3>
          
          <form onSubmit={createAttender} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Volunteer Bob"
                required
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bob@example.com"
                required
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Auto-generate if blank"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Generating..." : "Generate Account"}
            </Button>
          </form>

          {newCredentials && (
            <div className="mt-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-start gap-3">
                <KeySquare className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-700">Credentials Generated</h4>
                  <p className="text-sm text-emerald-600/80 mb-3">
                    Copy and send this temporary password to the volunteer. They will use it to log in at <strong>/auth/attender</strong>.
                  </p>
                  <div className="flex items-center gap-4 font-mono text-sm bg-white p-2 rounded border">
                    <span><strong>Email:</strong> {newCredentials.email}</span>
                    <span><strong>Password:</strong> {newCredentials.pass}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto h-6"
                      onClick={() => {
                        navigator.clipboard.writeText(`Login: ${newCredentials.email}\nPassword: ${newCredentials.pass}`);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="h-32 animate-pulse bg-surface m-6 rounded-xl" />
          ) : !attenders || attenders.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No attenders created"
              description="Generate credentials above to give volunteers access to the check-in scanner."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {attenders.map((attender: any) => (
                <div key={attender.id} className="p-4 flex items-center justify-between hover:bg-surface/30">
                  <div>
                    <h4 className="font-semibold">{attender.name}</h4>
                    <p className="text-sm text-muted-foreground">{attender.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(attender.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                    Revoke Access
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </>
  );
}
