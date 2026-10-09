import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) throw redirect({ to: "/auth/host" });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
