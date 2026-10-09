import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  LogOut,
  LayoutDashboard,
  Users,
  Gavel,
  FileText,
  Megaphone,
  BarChart3,
  Settings,
  Globe,
  ClipboardList,
  Trophy,
  Bell,
  User,
  Menu,
  Calendar,
  Info,
  ArrowLeft,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComponentType, ReactNode } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "./theme-toggle";

type HostKey =
  | "overview"
  | "website"
  | "form"
  | "registrations"
  | "judges"
  | "attenders"
  | "submissions"
  | "announcements"
  | "analytics"
  | "schedule"
  | "settings";

type HostNav = { key: HostKey; label: string; icon: ComponentType<{ className?: string }> };

const HOST_NAV: HostNav[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "website", label: "Website builder", icon: Globe },
  { key: "form", label: "Registration form", icon: ClipboardList },
  { key: "registrations", label: "Registrations", icon: Users },
  { key: "judges", label: "Judges", icon: Gavel },
  { key: "attenders", label: "Attenders", icon: Users },
  { key: "submissions", label: "Submissions", icon: FileText },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "schedule", label: "Schedule & Deadlines", icon: Calendar },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

type SimpleNavItem = { to: string; label: string; icon: ComponentType<{ className?: string }> };

const JUDGE_NAV: SimpleNavItem[] = [
  { to: "/dashboard/judge", label: "Assigned", icon: Users },
  { to: "/dashboard/judge", label: "Evaluations", icon: Trophy },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

const PARTICIPANT_NAV: SimpleNavItem[] = [
  { to: "/dashboard/participant", label: "My events", icon: LayoutDashboard },
  { to: "/dashboard/settings", label: "Profile & settings", icon: User },
];

const ATTENDER_NAV: SimpleNavItem[] = [
  { to: "/dashboard/attender/scan", label: "Take Attendance", icon: ClipboardList },
  { to: "/dashboard/attender/history", label: "Attendance History", icon: FileText },
  { to: "/dashboard/settings", label: "Profile & settings", icon: User },
];

const getParticipantEventNav = (eventId: string): SimpleNavItem[] => [
  { to: "/dashboard/participant", label: "← Back to events", icon: ArrowLeft },
  { to: `/dashboard/participant/events/${eventId}/info`, label: "Event Info", icon: Info },
  { to: `/dashboard/participant/events/${eventId}/announcements`, label: "Announcements", icon: Megaphone },
  { to: `/dashboard/participant/events/${eventId}/team`, label: "Team", icon: Users },
  { to: `/dashboard/participant/events/${eventId}/submissions`, label: "Submissions", icon: FileText },
  { to: `/dashboard/participant/events/${eventId}/schedule`, label: "Schedule & Deadlines", icon: Calendar },
];

const ROLE_LABEL = {
  host: "Host workspace",
  judge: "Judge portal",
  participant: "Participant",
  attender: "Attendance Taker",
};

function HostSidebarNav({ onNavigate, isMobile }: { onNavigate?: () => void, isMobile?: boolean }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: firstEventId } = useQuery({
    queryKey: ["host-first-event"],
    queryFn: async () => {
      const { data: u } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      if (!u.user) return null;
      const { data } = await supabase
        .from("events")
        .select("id")
        .eq("host_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    },
  });

  function onClick(key: HostKey) {
    if (onNavigate) onNavigate();
    
    if (key === "overview") {
      if (firstEventId) {
        navigate({ to: "/dashboard/host/events/$id", params: { id: firstEventId } });
      } else {
        navigate({ to: "/dashboard/host" });
      }
      return;
    }
    if (key === "settings") {
      navigate({ to: "/dashboard/settings" });
      return;
    }
    if (!firstEventId) {
      navigate({ to: "/dashboard/host" });
      toast.message("Create an event first", {
        description: "You'll unlock per-event tools once an event exists.",
        action: {
          label: "Create event",
          onClick: () => navigate({ to: "/events/create" }),
        },
      });
      return;
    }
    if (key === "website") {
      navigate({ to: "/dashboard/host/events/$id/website", params: { id: firstEventId } });
    } else if (key === "form") {
      navigate({ to: "/dashboard/host/events/$id/form", params: { id: firstEventId } });
    } else if (key === "registrations") {
      navigate({ to: "/dashboard/host/events/$id/registrations", params: { id: firstEventId } });
    } else if (key === "judges") {
      navigate({ to: "/dashboard/host/events/$id/judges", params: { id: firstEventId } });
    } else if (key === "attenders") {
      navigate({ to: "/dashboard/host/events/$id/attenders", params: { id: firstEventId } });
    } else if (key === "submissions") {
      navigate({ to: "/dashboard/host/events/$id/submissions", params: { id: firstEventId } });
    } else if (key === "announcements") {
      navigate({ to: "/dashboard/host/events/$id/announcements", params: { id: firstEventId } });
    } else if (key === "schedule") {
      navigate({ to: "/dashboard/host/events/$id/schedule", params: { id: firstEventId } });
    } else if (key === "analytics") {
      navigate({ to: "/dashboard/host/events/$id/analytics", params: { id: firstEventId } });
    }
  }

  return (
    <nav className={isMobile ? "flex items-center gap-2" : "space-y-0.5"}>
      {HOST_NAV.map((item) => {
        const active =
          (item.key === "overview" && pathname === `/dashboard/host/events/${firstEventId}`) ||
          (item.key === "overview" && pathname === "/dashboard/host" && !firstEventId) ||
          (item.key === "website" && pathname.includes("/website")) ||
          (item.key === "form" && pathname.includes("/form")) ||
          (item.key === "registrations" && pathname.includes("/registrations")) ||
          (item.key === "judges" && pathname.includes("/judges")) ||
          (item.key === "attenders" && pathname.includes("/attenders")) ||
          (item.key === "submissions" && pathname.includes("/submissions")) ||
          (item.key === "announcements" && pathname.includes("/announcements")) ||
          (item.key === "schedule" && pathname.includes("/schedule")) ||
          (item.key === "analytics" && pathname.includes("/analytics"));
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onClick(item.key)}
            className={`flex items-center gap-2.5 rounded-full px-3 py-1.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
              isMobile ? "" : "w-full"
            } ${
              active
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function MobileNav({ role }: { role: "host" | "judge" | "participant" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  let participantItems = PARTICIPANT_NAV;
  if (role === "participant" && pathname.includes("/dashboard/participant/events/")) {
    const match = pathname.match(/\/events\/([^/]+)/);
    if (match) participantItems = getParticipantEventNav(match[1]);
  }

  if (role === "host") return <HostSidebarNav isMobile />;
  return <SimpleSidebarNav items={role === "judge" ? JUDGE_NAV : participantItems} isMobile />;
}

function SimpleSidebarNav({ items, onNavigate, isMobile }: { items: SimpleNavItem[], onNavigate?: () => void, isMobile?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className={isMobile ? "flex items-center gap-2" : "space-y-0.5"}>
      {items.map((item, i) => {
        const active = i === 0 && pathname.startsWith(item.to);
        return (
          <Link
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              active
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ role, signOut, onNavigate }: { role: "host" | "judge" | "participant" | "attender", signOut: () => void, onNavigate?: () => void }) {
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
      return data.user;
    },
  });

  return (
    <>
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
          <div className="flex items-center h-8">
            <img src="/favicon.png" alt="EVENT-HUB Logo" className="h-full w-auto object-contain" />
          </div>
          <span className="text-sm font-semibold">EVENT-HUB</span>
        </div>
        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {ROLE_LABEL[role]}
          </div>
          {role === "host" ? (
            <HostSidebarNav onNavigate={onNavigate} />
          ) : role === "judge" ? (
            <SimpleSidebarNav items={JUDGE_NAV} onNavigate={onNavigate} />
          ) : role === "attender" ? (
            <SimpleSidebarNav items={ATTENDER_NAV} onNavigate={onNavigate} />
          ) : (
            <SimpleSidebarNav 
              items={
                useRouterState({ select: (s) => s.location.pathname }).includes("/dashboard/participant/events/")
                  ? getParticipantEventNav(useRouterState({ select: (s) => s.location.pathname }).match(/\/events\/([^/]+)/)?.[1] || "")
                  : PARTICIPANT_NAV
              } 
              onNavigate={onNavigate} 
            />
          )}
        </div>
        <div className="mt-auto border-t border-border/60 p-4">
          {user && (
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-medium text-brand-foreground">
                {user.email?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
    </>
  );
}

export function DashboardShell({
  role,
  children,
}: {
  role: "host" | "judge" | "participant" | "attender";
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground flex-col md:flex-row relative">
      {/* Decorative background blobs for glassmorphism effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/30 liquid-glass md:flex h-screen sticky top-0 z-20">
        <SidebarContent role={role} signOut={signOut} />
      </aside>
      
      <div className="md:hidden flex sticky top-0 z-40 liquid-glass border-b border-border/30 h-16 items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col liquid-glass-heavy border-r-border/30">
              <SidebarContent role={role} signOut={signOut} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex items-center h-8">
              <img src="/favicon.png" alt="EVENT-HUB Logo" className="h-full w-auto object-contain" />
            </div>
            <span className="text-sm font-semibold tracking-tight">EVENT-HUB</span>
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 relative z-10 pb-20 md:pb-0">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-b border-border/30 liquid-glass">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-6 py-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {action}
          <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block" />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl liquid-glass p-5 relative overflow-hidden transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = LayoutDashboard,
}: {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/50 liquid-glass p-10 text-center transition-all duration-300 hover:border-brand/50">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
