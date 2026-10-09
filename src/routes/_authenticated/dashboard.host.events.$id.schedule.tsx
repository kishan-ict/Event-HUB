import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Trash2, Plus, MoveUp, MoveDown } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/schedule"
)({
  head: () => ({ meta: [{ title: "Schedule & Deadlines — EVENT-HUB" }] }),
  component: ScheduleAdmin,
});

type TimelineBlock = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
};

function ScheduleAdmin() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  
  const [blocks, setBlocks] = useState<TimelineBlock[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["event-schedule", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name, schedule_timeline")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (event?.schedule_timeline) {
      setBlocks(event.schedule_timeline as unknown as TimelineBlock[]);
    } else {
      setBlocks([]);
    }
  }, [event]);

  function addBlock() {
    setBlocks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", date: "" },
    ]);
  }

  function updateBlock(blockId: string, updates: Partial<TimelineBlock>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    );
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    if (index + direction < 0 || index + direction >= blocks.length) return;
    setBlocks((prev) => {
      const clone = [...prev];
      const temp = clone[index];
      clone[index] = clone[index + direction];
      clone[index + direction] = temp;
      return clone;
    });
  }

  async function save() {
    // Validation
    for (const b of blocks) {
      if (!b.title?.trim() || !b.date?.trim() || !b.endDate?.trim() || !b.startTime?.trim() || !b.endTime?.trim() || !b.description?.trim()) {
        toast.error(`Please fill out ALL fields for the milestone: "${b.title || 'Untitled'}"`);
        return;
      }
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ schedule_timeline: blocks as never })
        .eq("id", id);
        
      if (error) throw error;
      toast.success("Schedule saved");
      qc.invalidateQueries({ queryKey: ["event-schedule", id] });
      qc.invalidateQueries({ queryKey: ["event-checklist", id] });
    } catch (err: any) {
      console.error("Save schedule error:", err);
      toast.error(err?.message || "Failed to save schedule");
    } finally {
      setSaving(false);
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
            Schedule & Deadlines
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Event Timeline</h1>
            <p className="text-sm text-muted-foreground">
              Configure the schedule milestones and deadlines for participants to see.
            </p>
          </div>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No schedule defined</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground mb-4">
              Add timeline blocks to inform participants of important dates.
            </p>
            <Button onClick={addBlock} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Milestone
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((b, i) => (
              <Card key={b.id} className="p-5 flex gap-4">
                <div className="flex flex-col gap-1 items-center justify-center border-r border-border/60 pr-4">
                  <Button size="icon" variant="ghost" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}>
                    <MoveDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                      <Label>Title</Label>
                      <Input 
                        value={b.title} 
                        onChange={(e) => updateBlock(b.id, { title: e.target.value })} 
                        placeholder="e.g. Project Submission Deadline"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input 
                        type="date"
                        value={b.date} 
                        onChange={(e) => updateBlock(b.id, { date: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input 
                        type="date"
                        value={b.endDate ?? ""} 
                        onChange={(e) => updateBlock(b.id, { endDate: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input 
                        type="time"
                        value={b.startTime ?? ""} 
                        onChange={(e) => updateBlock(b.id, { startTime: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input 
                        type="time"
                        value={b.endTime ?? ""} 
                        onChange={(e) => updateBlock(b.id, { endTime: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Textarea 
                      value={b.description ?? ""} 
                      onChange={(e) => updateBlock(b.id, { description: e.target.value })} 
                      placeholder="Add event details..."
                      rows={2}
                    />
                  </div>
                </div>
                <div>
                  <ConfirmDeleteDialog onConfirm={() => removeBlock(b.id)} title="Delete Milestone?">
                    <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ConfirmDeleteDialog>
                </div>
              </Card>
            ))}
            <Button onClick={addBlock} variant="outline" className="w-full border-dashed">
              <Plus className="mr-2 h-4 w-4" /> Add Another Milestone
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
