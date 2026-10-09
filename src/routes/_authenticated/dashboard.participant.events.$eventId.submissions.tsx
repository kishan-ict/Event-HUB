import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { FileUp, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/participant/events/$eventId/submissions"
)({
  head: () => ({ meta: [{ title: "Submit Project — EVENT-HUB" }] }),
  component: ParticipantSubmission,
});

const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "video/mp4",
];

function ParticipantSubmission() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["submit-event-info", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, categories, theme_color, is_published")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["submit-existing", eventId],
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) return null;
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title ?? "");
      setDescription(existing.description ?? "");
      setCategory(existing.category ?? "");
    }
  }, [existing]);

  if (loadingEvent || loadingExisting) {
    return (
      <div className="p-8 animate-pulse bg-surface h-32 rounded-xl mx-auto max-w-2xl mt-8" />
    );
  }

  if (!event) return null;

  const locked = existing && existing.status !== "draft" && existing.status !== "submitted";

  function pickFile(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be 25MB or smaller");
      return;
    }
    if (ALLOWED.length > 0 && !ALLOWED.includes(f.type) && f.type !== "") {
      toast.error(`File type not allowed: ${f.type}`);
      return;
    }
    setFile(f);
  }

  async function save(status: "draft" | "submitted") {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) throw new Error("Not signed in");

      let filePath = existing?.file_path ?? null;
      let fileName = existing?.file_name ?? null;
      let fileSize = existing?.file_size ?? null;
      let fileType = existing?.file_type ?? null;

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${u.user.id}/${event!.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("submissions")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        if (existing?.file_path) {
          await supabase.storage.from("submissions").remove([existing.file_path]);
        }
        filePath = path;
        fileName = file.name;
        fileSize = file.size;
        fileType = file.type;
      }

      if (status === "submitted" && !filePath) {
        throw new Error("Attach a file before submitting");
      }

      const payload = {
        event_id: event!.id,
        user_id: u.user.id,
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 5000) || null,
        category: category || null,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      };

      if (existing) {
        const { error } = await supabase
          .from("submissions")
          .update(payload as never)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("submissions").insert(payload as never);
        if (error) throw error;
      }

      toast.success(status === "submitted" ? "Submitted successfully" : "Draft saved");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["submit-existing", event!.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUploading(false);
    }
  }

  const theme = event.theme_color ?? undefined;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Project Submission</h1>
        {existing?.status && (
          <Badge variant={existing.status === "scored" ? "default" : "secondary"}>
            {existing.status.replace("_", " ")}
          </Badge>
        )}
      </div>

      {locked && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-500 font-medium">
          Your submission is under review and can no longer be edited.
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="s-title">Title *</Label>
            <Input
              id="s-title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!!locked}
              placeholder="Project title"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea
              id="s-desc"
              value={description}
              rows={5}
              maxLength={5000}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!!locked}
              placeholder="What did you build?"
              className="text-base p-4 resize-none"
            />
          </div>
          {(event.categories?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="s-cat">Category</Label>
              <select
                id="s-cat"
                value={category}
                disabled={!!locked}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-transparent px-4 py-2 text-base shadow-sm"
              >
                <option value="">Select…</option>
                {event.categories.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="s-file">File</Label>
            <div className="rounded-md border border-dashed border-border/60 p-4">
              {existing?.file_name && !file && (
                <div className="mb-3 flex items-center justify-between rounded-md border border-border/60 bg-surface/40 p-2 text-xs">
                  <span className="truncate">{existing.file_name}</span>
                  {existing.file_size != null && (
                    <span className="ml-2 shrink-0 text-muted-foreground">
                      {(existing.file_size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              )}
              <input
                id="s-file"
                type="file"
                disabled={!!locked}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-elevated file:px-3 file:py-1.5 file:text-sm"
              />
              {file && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="truncate">{file.name}</span>
                  <ConfirmDeleteDialog onConfirm={() => setFile(null)} title="Remove File?">
                    <button
                      type="button"
                      className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </ConfirmDeleteDialog>
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                Max 25MB. PDF, ZIP, DOCX, PPTX, PNG/JPG/WEBP, MP4, TXT, MD.
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border/60">
            <Button
              variant="outline"
              className="flex-1 py-6 text-base"
              onClick={() => save("draft")}
              disabled={uploading || !!locked}
            >
              {uploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Save draft
            </Button>
            <Button
              className="flex-[2] bg-brand text-brand-foreground hover:bg-brand/90 py-6 text-base font-semibold shadow-md"
              onClick={() => save("submitted")}
              disabled={uploading || !!locked}
              style={theme ? { backgroundColor: theme, color: "white" } : undefined}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-5 w-5" />
              )}
              Submit Project
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
