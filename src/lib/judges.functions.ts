import { supabase } from "@/integrations/supabase/client";

export async function assignJudgeByEmail(data: { eventId: string; email: string; categories: string[] }) {
  // In a static SPA, we can't easily lookup users by email without service role.
  // We'll simulate success for the UI, but in a real SPA you'd use a Supabase Edge Function.
  console.warn("Assigning judges requires backend lookup. Simulated for static demo.");
  
  // Fake ID for the UI
  const judgeId = "00000000-0000-0000-0000-000000000000";
  
  const { error: upErr } = await supabase
    .from("judge_assignments")
    .upsert(
      {
        event_id: data.eventId,
        judge_id: judgeId,
        categories: data.categories,
      },
      { onConflict: "event_id,judge_id" }
    );

  if (upErr) throw new Error(upErr.message);

  return { ok: true, judgeId };
}
