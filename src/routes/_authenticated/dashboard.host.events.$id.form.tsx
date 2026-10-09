import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultField,
  FIELD_TYPES,
  type FieldType,
  type RegField,
} from "@/lib/registration-fields";
import { FieldRenderer } from "./event.$slug.form.register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  GripVertical,
  Monitor,
  Plus,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

export const Route = createFileRoute("/_authenticated/dashboard/host/events/$id/form")({
  head: () => ({ meta: [{ title: "Registration form — EVENT-HUB" }] }),
  component: FormBuilder,
});

type Viewport = "desktop" | "tablet" | "mobile";
const VP_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

function FormBuilder() {
  const { id } = Route.useParams();
  const [fields, setFields] = useState<RegField[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const { data: event, isLoading, refetch } = useQuery({
    queryKey: ["event-form", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, registration_fields, require_approval, is_published")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function toggleApproval(next: boolean) {
    const { error } = await supabase
      .from("events")
      .update({ require_approval: next } as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next ? "New registrations will need approval" : "Registrations auto-confirmed");
    refetch();
  }

  useEffect(() => {
    if (event?.registration_fields) {
      setFields(event.registration_fields as unknown as RegField[]);
    }
  }, [event]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = fields.findIndex((f) => f.id === active.id);
    const newI = fields.findIndex((f) => f.id === over.id);
    setFields((f) => arrayMove(f, oldI, newI));
  }

  const isPublished = !!event?.is_published;

  async function unpublish() {
    const { error } = await supabase
      .from("events")
      .update({ is_published: false } as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Returned to Draft — you can now edit the form");
    refetch();
  }

  async function save() {
    if (isPublished) {
      toast.error("Return to Draft to edit the registration form");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ registration_fields: fields } as never)
        .eq("id", id);
      if (error) throw error;
      toast.success("Form saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const selectedField = fields.find((f) => f.id === selected) ?? null;

  function updateField(patch: Partial<RegField>) {
    if (!selectedField) return;
    setFields((f) =>
      f.map((x) => (x.id === selectedField.id ? { ...x, ...patch } : x))
    );
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Registration form</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the form participants will fill out to register for your event.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <label className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium bg-surface/50">
            <Switch
              checked={isPublished}
              onCheckedChange={async (v) => {
                const { error } = await supabase.from("events").update({ is_published: v } as never).eq("id", id);
                if (error) return toast.error(error.message);
                toast.success(v ? "Registrations are now open" : "Registrations closed");
                refetch();
              }}
            />
            <span className="whitespace-nowrap">Registrations open</span>
          </label>
          <label className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium bg-surface/50">
            <Switch
              checked={!!event?.require_approval}
              onCheckedChange={toggleApproval}
            />
            <span className="whitespace-nowrap">Require approval</span>
          </label>
          {event?.slug && (
            <a
              href={`https://event-hub.pages.dev/event/${event.slug}/form/register`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium hover:bg-surface"
            >
              {event.is_published ? "Open form" : "Preview form"}
            </a>
          )}
          <Button onClick={save} disabled={saving || isPublished} className="flex-1 sm:flex-none w-full sm:w-auto bg-brand text-brand-foreground hover:bg-brand/90">
            {saving ? "Saving…" : isPublished ? "Locked (Published)" : "Save Form"}
          </Button>
        </div>
      </header>

      {isPublished && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
          <span>
            Form is locked because this event is <b>Published</b>. Changing fields
            after registrations exist can break earlier submissions.
          </span>
          <Button size="sm" variant="outline" onClick={unpublish}>
            Return to Draft
          </Button>
        </div>
      )}

      <div className="flex flex-col flex-1 gap-0 lg:grid lg:grid-cols-[280px_1fr_320px]">
        {/* Left: field list */}
        <aside className="order-1 lg:order-none border-b lg:border-b-0 lg:border-r border-border/60 bg-surface/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Fields
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFields((f) => [...f, defaultField()])}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {fields.map((f) => (
                  <SortableFieldRow
                    key={f.id}
                    field={f}
                    active={selected === f.id}
                    onSelect={() => setSelected(f.id)}
                    onDelete={() => {
                      setFields((s) => s.filter((x) => x.id !== f.id));
                      if (selected === f.id) setSelected(null);
                    }}
                  />
                ))}
                {fields.length === 0 && (
                  <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                    No fields yet
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </aside>

        {/* Center: live preview */}
        <main className="order-3 lg:order-none min-h-[70vh] overflow-auto bg-surface/10 p-6">
          <div
            className="mx-auto rounded-xl border border-border/60 bg-background shadow-sm transition-all"
            style={{ maxWidth: VP_WIDTH[viewport] }}
          >
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Register</h2>
                <p className="text-xs text-muted-foreground">Live preview</p>
              </div>
              <div className="space-y-4">
                {fields.map((f) => (
                  <FieldRenderer
                    key={f.id}
                    field={f}
                    value={f.type === "checkbox" ? false : ""}
                    onChange={() => {}}
                    disabled
                  />
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Right: property panel */}
        <aside className="order-2 lg:order-none border-b lg:border-b-0 lg:border-l border-border/60 bg-surface/30 p-4">
          {!selectedField ? (
            <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
              Select a field to edit its properties
            </div>
          ) : (
            <div className="space-y-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Field properties
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-label">Label</Label>
                <Input
                  id="f-label"
                  value={selectedField.label}
                  onChange={(e) => updateField({ label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-type">Type</Label>
                <select
                  id="f-type"
                  disabled={selectedField.system}
                  value={selectedField.type}
                  onChange={(e) => updateField({ type: e.target.value as FieldType })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:opacity-50"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-background text-foreground">{t.label}</option>
                  ))}
                </select>
              </div>
              {(selectedField.type === "text" ||
                selectedField.type === "email" ||
                selectedField.type === "tel" ||
                selectedField.type === "number" ||
                selectedField.type === "textarea") && (
                <div className="space-y-2">
                  <Label htmlFor="f-ph">Placeholder</Label>
                  <Input
                    id="f-ph"
                    value={selectedField.placeholder ?? ""}
                    onChange={(e) => updateField({ placeholder: e.target.value })}
                  />
                </div>
              )}
              {selectedField.type === "select" && (
                <div className="space-y-2">
                  <Label htmlFor="f-opts">Options (one per line)</Label>
                  <textarea
                    id="f-opts"
                    rows={4}
                    value={(selectedField.options ?? []).join("\n")}
                    onChange={(e) =>
                      updateField({
                        options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  />
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                <div>
                  <div className="text-sm">Required</div>
                  <div className="text-xs text-muted-foreground">Must be filled</div>
                </div>
                <Switch
                  checked={selectedField.required}
                  onCheckedChange={(v) => updateField({ required: v })}
                />
              </div>
              {!selectedField.system && (
                <ConfirmDeleteDialog
                  title="Delete Field?"
                  onConfirm={() => {
                    setFields((f) => f.filter((x) => x.id !== selectedField.id));
                    setSelected(null);
                  }}
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete field
                  </Button>
                </ConfirmDeleteDialog>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SortableFieldRow({
  field,
  active,
  onSelect,
  onDelete,
}: {
  field: RegField;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm ${
        active ? "border-foreground/40 bg-surface-elevated" : "border-border/60 bg-card"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 truncate text-left"
      >
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </button>
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {field.type}
      </span>
      {!field.system && (
        <ConfirmDeleteDialog title="Delete Field?" onConfirm={onDelete}>
          <button
            type="button"
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </ConfirmDeleteDialog>
      )}
    </div>
  );
}

function ViewportBtn({
  active,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid h-7 w-8 place-items-center rounded ${
        active ? "bg-surface-elevated text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
