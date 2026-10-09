import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard-shell";
import { downloadCsv, toCsv } from "@/lib/csv";
import { exportSvgAsPng } from "@/lib/export-chart";
import { ArrowLeft, Download, FileImage, FileSpreadsheet } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authenticated/dashboard/host/events/$id/analytics"
)({
  head: () => ({ meta: [{ title: "Analytics — EVENT-HUB" }] }),
  component: AnalyticsPage,
});

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

function AnalyticsPage() {
  const { id } = Route.useParams();
  const funnelRef = useRef<HTMLDivElement>(null);
  const byDayRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  async function runExport(key: string, label: string, fn: () => void | Promise<void>) {
    if (exporting) return;
    setExporting(key);
    const toastId = toast.loading(`Exporting ${label}…`);
    try {
      await fn();
      toast.success(`${label} exported`, { id: toastId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to export ${label}`, {
        id: toastId,
      });
    } finally {
      setExporting(null);
    }
  }

  const { data: event } = useQuery({
    queryKey: ["event-analytics-name", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ["analytics-registrations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, created_at, status, data")
        .eq("event_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["analytics-submissions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, created_at, status, category, title")
        .eq("event_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const regs = registrations ?? [];
  const subs = submissions ?? [];

  // Registrations per day
  const regByDay = groupByDay(regs.map((r) => r.created_at));
  const subByDay = groupByDay(subs.map((s) => s.created_at));
  const combinedTimeline = mergeSeries(regByDay, subByDay);

  // Registrations-by-day (its own series for the funnel section)
  const regTimeline = Object.entries(regByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), registrations: count }));

  // Registration funnel by status
  const regStatusCounts = countBy(regs.map((r) => r.status));
  const regSubmitted = regs.length;
  const regPending = regStatusCounts["pending"] ?? 0;
  const regApproved = regStatusCounts["approved"] ?? 0;
  const regConfirmed = regStatusCounts["confirmed"] ?? 0;
  const regRejected = regStatusCounts["rejected"] ?? 0;
  const regAccepted = regApproved + regConfirmed;
  const funnelData = [
    { stage: "Submitted", count: regSubmitted },
    { stage: "Pending", count: regPending },
    { stage: "Approved", count: regAccepted },
    { stage: "Rejected", count: regRejected },
  ];
  const acceptanceRate = regSubmitted
    ? Math.round((regAccepted / regSubmitted) * 100)
    : 0;

  // Pending-to-approved conversion trend over time (by registration created_at day)
  const conversionByDay: Record<
    string,
    { total: number; approved: number; rejected: number; pending: number }
  > = {};
  for (const r of regs) {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    const bucket =
      conversionByDay[key] ?? { total: 0, approved: 0, rejected: 0, pending: 0 };
    bucket.total += 1;
    if (r.status === "approved" || r.status === "confirmed") bucket.approved += 1;
    else if (r.status === "rejected") bucket.rejected += 1;
    else bucket.pending += 1;
    conversionByDay[key] = bucket;
  }
  const conversionTrend = Object.entries(conversionByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: date.slice(5),
      approved: v.approved,
      rejected: v.rejected,
      pending: v.pending,
      rate: v.total ? Math.round((v.approved / v.total) * 100) : 0,
    }));

  // Submission status breakdown
  const statusCounts = countBy(subs.map((s) => s.status));
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  // Category breakdown
  const catCounts = countBy(subs.map((s) => s.category ?? "Uncategorized"));
  const catData = Object.entries(catCounts).map(([category, count]) => ({
    category,
    count,
  }));

  const judged = subs.filter((s) => s.status === "scored").length;
  const pending = subs.filter((s) => s.status !== "scored").length;

  function exportRegs() {
    downloadCsv(
      `registrations-${event?.name ?? id}.csv`,
      toCsv(
        regs.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          status: r.status,
          ...flatten(r.data as Record<string, unknown>),
        }))
      )
    );
  }
  function exportSubs() {
    downloadCsv(
      `submissions-${event?.name ?? id}.csv`,
      toCsv(
        subs.map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category ?? "",
          status: s.status,
          created_at: s.created_at,
        }))
      )
    );
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
            Analytics
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportRegs}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Registrations
          </Button>
          <Button variant="outline" size="sm" onClick={exportSubs}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Submissions
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-24">
        <div className="rounded-xl border border-dashed border-border/60 bg-surface/30 p-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-muted-foreground"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </div>
          <h3 className="mt-4 text-xl font-semibold">Analytics</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            We are working hard to bring you comprehensive event analytics.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            Coming in the next release
          </div>
        </div>
      </main>
    </div>
  );
}

function groupByDay(dates: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of dates) {
    const key = new Date(d).toISOString().slice(0, 10);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
function mergeSeries(a: Record<string, number>, b: Record<string, number>) {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  return keys.map((date) => ({
    date: date.slice(5),
    registrations: a[date] ?? 0,
    submissions: b[date] ?? 0,
  }));
}
function countBy(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of items) out[s] = (out[s] ?? 0) + 1;
  return out;
}
function flatten(obj: Record<string, unknown> | null | undefined) {
  if (!obj) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[`field_${k}`] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}
