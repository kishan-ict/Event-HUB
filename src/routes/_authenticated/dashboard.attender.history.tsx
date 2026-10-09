import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { FileText, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/attender/history")({
  head: () => ({ meta: [{ title: "Attendance History — EVENT-HUB" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["attendance-history"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getSession();
      const userId = u.session?.user.id;
      if (!userId) return [];

      const { data: records, error } = await supabase
        .from("registrations")
        .select(`
          id,
          checked_in_at,
          attendance_status,
          user_id
        `)
        .eq("checked_in_by", userId)
        .order("checked_in_at", { ascending: false });

      if (error) throw error;

      if (!records || records.length === 0) return [];

      // Fetch profiles
      const userIds = records.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);

      return records.map((r: any) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.user_id),
      }));
    },
  });

  return (
    <>
      <PageHeader title="Attendance History" subtitle="Participants you have checked in." />
      <div className="mx-auto max-w-4xl p-6">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-card" />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No history yet"
            description="You haven't checked anyone in yet today."
          />
        ) : (
          <div className="space-y-3">
            {data.map((record: any) => (
              <Card key={record.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">
                    {record.profile?.first_name} {record.profile?.last_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">{record.profile?.email}</p>
                  <p className="mt-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {new Date(record.checked_in_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  {record.attendance_status === "present" ? (
                    <div className="flex items-center text-emerald-600 gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Present
                    </div>
                  ) : (
                    <div className="flex items-center text-muted-foreground gap-1.5 font-medium">
                      <XCircle className="h-4 w-4" /> Absent
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
