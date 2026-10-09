import { supabase } from "@/integrations/supabase/client";

export async function submitRegistration(data: { eventId: string; values: Record<string, string | boolean> }) {
  // In a static SPA, we must do client-side validation then insert.
  const { data: { user } } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
  if (!user) throw new Error("Unauthorized");
  
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, name, registration_fields, is_published, require_approval, capacity")
    .eq("id", data.eventId)
    .maybeSingle();
    
  if (eventErr || !event || !event.is_published) {
    throw new Error("This event is not open for registration");
  }

  if (event.capacity) {
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", data.eventId);
    if ((count ?? 0) >= event.capacity) {
      throw new Error("This event has reached its maximum capacity");
    }
  }

  const status = (event as any).require_approval ? "pending" : "confirmed";

  const { data: inserted, error: insertErr } = await supabase
    .from("registrations")
    .insert({
      event_id: event.id,
      user_id: user.id,
      data: data.values as any,
      status,
    } as never)
    .select("id, status, created_at")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  return { ok: true, id: (inserted as any).id, status: (inserted as any).status, createdAt: (inserted as any).created_at };
}

export async function updateRegistrationStatus(data: { registrationId: string; decision: "approved" | "rejected" | "pending" }) {
  const { error } = await supabase
    .from("registrations")
    .update({ status: data.decision } as never)
    .eq("id", data.registrationId);
    
  if (error) throw new Error(error.message);
  return { ok: true };
}
