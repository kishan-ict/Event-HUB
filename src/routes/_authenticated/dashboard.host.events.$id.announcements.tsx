import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Megaphone, Pin, Trash2, Plus } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/announcements"
)({
  head: () => ({ meta: [{ title: "Announcements — EVENT-HUB" }] }),
  component: AnnouncementsAdmin,
});

function AnnouncementsAdmin() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["event-name", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["announcements", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("event_id", id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (event) {
      const tourKey = `host-announcements-tour-seen-${id}`;
      if (!localStorage.getItem(tourKey)) {
        setTimeout(() => {
          const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
              { element: '#tour-announcements-create', popover: { title: 'Create Announcements 📢', description: 'Write a message to broadcast to all your participants and judges.', side: "bottom", align: 'start' } },
              { element: '#tour-announcements-list', popover: { title: 'Manage Announcements 📰', description: 'Here you can see past announcements, pin important ones to the top, or delete them.', side: "top", align: 'start' } },
            ],
            onDestroyStarted: () => {
              localStorage.setItem(tourKey, 'true');
              driverObj.destroy();
            }
          });
          driverObj.drive();
        }, 500);
      }
    }
  }, [event, id]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("announcements").insert({
        event_id: id,
        title: title.trim().slice(0, 200),
        body: body.trim().slice(0, 5000),
        pinned,
        created_by: u.user.id,
      } as never);
      if (error) throw error;
      setTitle("");
      setBody("");
      setPinned(false);
      toast.success("Announcement posted");
      qc.invalidateQueries({ queryKey: ["announcements", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(annId: string, next: boolean) {
    const { error } = await supabase
      .from("announcements")
      .update({ pinned: next } as never)
      .eq("id", annId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["announcements", id] });
  }

  async function remove(annId: string) {
    const { error } = await supabase.from("announcements").delete().eq("id", annId);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["announcements", id] });
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
            Announcements
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Card className="p-6">
          <form id="tour-announcements-create" onSubmit={create} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="a-title">Title</Label>
              <Input
                id="a-title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kickoff moved to 10 AM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-body">Body</Label>
              <Textarea
                id="a-body"
                value={body}
                rows={4}
                maxLength={5000}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Full details for participants and judges…"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div>
                <div className="text-sm">Pin to top</div>
                <div className="text-xs text-muted-foreground">
                  Show above other announcements
                </div>
              </div>
              <Switch checked={pinned} onCheckedChange={setPinned} />
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="mr-1.5 h-4 w-4" />
              {saving ? "Posting…" : "Post announcement"}
            </Button>
          </form>
        </Card>

        <h2 className="mt-8 mb-3 text-sm font-semibold">Published</h2>
        <div id="tour-announcements-list" className="space-y-3">
          {(items ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-16 text-center mt-6">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
                <Megaphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">No announcements yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Post an announcement to notify all participants and judges.
              </p>
            </div>
          ) : (
            items!.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.pinned && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Pin className="mr-1 h-2.5 w-2.5" /> Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {a.body}
                    </p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePin(a.id, !a.pinned)}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDeleteDialog onConfirm={() => remove(a.id)} title="Delete Announcement?">
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
