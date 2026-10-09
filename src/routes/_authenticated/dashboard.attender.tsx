import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/dashboard/attender")({
  head: () => ({ meta: [{ title: "Attender dashboard — EVENT-HUB" }] }),
  component: AttenderDashboard,
});

function AttenderDashboard() {
  return (
    <DashboardShell role="attender">
      <Outlet />
    </DashboardShell>
  );
}
