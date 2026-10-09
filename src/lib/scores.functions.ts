import { supabase } from "@/integrations/supabase/client";



export async function saveSubmissionScore(args: { data: { eventId: string; submissionId: string; criteriaScores: Record<string, number>; feedback: string | null } }) {
  const { data: { user } } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("submission_scores")
    .upsert({
      event_id: args.data.eventId,
      submission_id: args.data.submissionId,
      judge_id: user.id,
      criteria_scores: args.data.criteriaScores as any,
      feedback: args.data.feedback,
    }, { onConflict: "submission_id,judge_id" });

  if (error) throw new Error(error.message);
  
  const totalScore = Object.values(args.data.criteriaScores).reduce((a, b) => a + b, 0);
  return { ok: true, totalScore };
}

export async function getSignedSubmissionUrl(args: { data: { submissionId: string } }) {
  const { data: submission } = await supabase
    .from("submissions")
    .select("file_path")
    .eq("id", args.data.submissionId)
    .single();
    
  if (!submission || !submission.file_path) throw new Error("No file");
  
  const { data, error } = await supabase.storage.from("submissions").createSignedUrl(submission.file_path, 60 * 60);
  if (error) throw new Error(error.message);
  
  return { url: data.signedUrl };
}
