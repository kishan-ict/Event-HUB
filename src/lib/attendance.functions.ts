import { supabase } from "@/integrations/supabase/client";

export async function processCheckInCode(code: string) {
  const { data: userAuth } = await supabase.auth.getSession();
  const userId = userAuth.session?.user.id;
  if (!userId) throw new Error("Unauthorized");

  // Get the attender details to scope the scan to their event
  const { data: attender, error: attenderErr } = await supabase
    .from("attenders")
    .select("event_id, id")
    .eq("id", userId)
    .single();

  if (attenderErr || !attender) {
    throw new Error("You are not registered as an attender.");
  }

  // Find the registration by code
  const { data: reg, error: regErr } = await (supabase.from("registrations" as never) as any)
    .select(`
      id, 
      event_id, 
      checked_in_at, 
      checked_in_by, 
      attendance_status,
      data,
      user_id
    `)
    .eq("check_in_code", code)
    .maybeSingle();

  if (regErr || !reg) {
    throw new Error("Invalid check-in code.");
  }

  if (reg.event_id !== attender.event_id) {
    throw new Error("This code is for a different event.");
  }

  // Get user profile info for display
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", reg.user_id)
    .maybeSingle();

  return {
    registration: reg,
    profile,
    attender,
  };
}

export async function updateAttendanceStatus(registrationId: string, status: "present" | "absent") {
  const { data: userAuth } = await supabase.auth.getSession();
  const userId = userAuth.session?.user.id;
  if (!userId) throw new Error("Unauthorized");

  const now = status === "present" ? new Date().toISOString() : null;

  const { error } = await (supabase.from("registrations" as never) as any)
    .update({
      attendance_status: status,
      checked_in_at: now,
      checked_in_by: userId,
    })
    .eq("id", registrationId);

  if (error) throw new Error(error.message);
  return { ok: true };
}
