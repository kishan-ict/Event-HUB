import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/attender/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/attender/scan" });
  },
});
