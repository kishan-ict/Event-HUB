import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/settings"
)({
  head: () => ({ meta: [{ title: "Settings — EVENT-HUB" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: event, refetch } = useQuery({
    queryKey: ["event-settings", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name, capacity")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const [capacity, setCapacity] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (event?.capacity !== undefined && event?.capacity !== null) {
      setCapacity(event.capacity.toString());
    } else {
      setCapacity("");
    }
  }, [event]);

  async function updateCapacity() {
    setIsUpdating(true);
    try {
      const val = capacity.trim() === "" ? null : parseInt(capacity, 10);
      const { error } = await supabase
        .from("events")
        .update({ capacity: val })
        .eq("id", id);
      if (error) throw error;
      toast.success("Capacity updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update capacity");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Event deleted successfully");
      navigate({ to: "/dashboard/host" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <Link
          to="/dashboard/host"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{event?.name}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Settings
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">General Settings</h3>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            Manage your event's core configuration.
          </p>
          <div className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label>Maximum Capacity</Label>
              <Input
                type="number"
                placeholder="Leave blank for unlimited"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                The maximum number of participants that can register.
              </p>
            </div>
            <Button onClick={updateCapacity} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete this event and all associated data, including registrations, submissions, and judge scores. This action cannot be undone.
              </p>
              <Button 
                variant="destructive" 
                className="mt-4"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete event"}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
