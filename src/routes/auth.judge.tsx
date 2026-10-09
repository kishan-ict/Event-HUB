import { createFileRoute } from "@tanstack/react-router";
import { AuthForm, AuthShell } from "./auth.host";

export const Route = createFileRoute("/auth/judge")({
  head: () => ({
    meta: [{ title: "Judge sign in — EVENT-HUB" }],
  }),
  component: JudgeAuth,
});

function JudgeAuth() {
  return (
    <AuthShell subtitle="For judges">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Sign in as judge</h1>
        <p className="text-sm text-muted-foreground">
          Use the credentials your event host provided.
        </p>
      </div>
      <div className="mt-6">
        <AuthForm mode="signin" role="judge" />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Judges are created by hosts. If you don't have credentials, contact your event
        organizer.
      </p>
    </AuthShell>
  );
}
