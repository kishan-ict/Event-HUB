import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Calendar,
  Gavel,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
  BarChart3,
  Palette,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EVENT-HUB — Run world-class events end to end" },
      {
        name: "description",
        content:
          "Build event sites, manage participants, and coordinate judges — all in one modern platform.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <RoleGrid />
      <FeatureGrid />
      <CTA />
      <Footer />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center h-8">
            <img src="/favicon.png" alt="EVENT-HUB Logo" className="h-full w-auto object-contain" />
          </div>
          <span className="text-sm font-semibold tracking-tight">EVENT-HUB</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#roles" className="hover:text-foreground">
            For teams
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth/attender" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm">
              Attender
            </Button>
          </Link>
          <Link to="/auth/judge" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm">
              Judge
            </Button>
          </Link>
          <Link to="/auth/host">
            <Button size="sm">Host</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/70 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="font-mono">v1.0 — now in early access</span>
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Run world-class events,{" "}
            <span className="block sm:inline bg-brand-gradient bg-clip-text text-transparent">
              end to end
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            The event operating system for hackathons, competitions, and awards.
            Build event sites, manage participants, and coordinate judging — without the
            spreadsheet chaos.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/events/create" className="w-full sm:w-auto">
              <Button size="lg" className="group w-full sm:w-auto">
                Create an event
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/auth/host" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Create an account
              </Button>
            </Link>
          </div>
          <p className="mt-6 font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
            Participants — visit your event's website to sign in
          </p>
        </div>
      </div>
    </section>
  );
}

function RoleGrid() {
  const roles = [
    {
      icon: LayoutDashboard,
      title: "Hosts",
      desc: "Design event sites, build registration forms, manage judges and submissions.",
      href: "/auth/host",
      cta: "Host portal",
    },
    {
      icon: Gavel,
      title: "Judges",
      desc: "Review assigned participants and score against custom criteria.",
      href: "/auth/judge",
      cta: "Judge portal",
    },
    {
      icon: ShieldCheck,
      title: "Attenders",
      desc: "Scan QR codes at the door to quickly verify and check-in participants.",
      href: "/auth/attender",
      cta: "Scanner portal",
    },
    {
      icon: Users,
      title: "Participants",
      desc: "Register through the event website, submit deliverables, view announcements.",
      href: "/",
      cta: "Via event site",
    },
  ] as const;

  return (
    <section id="roles" className="border-t border-border/60 bg-surface/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Three roles, one platform
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Purpose-built for everyone involved
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((r) => (
            <Card
              key={r.title}
              className="group relative overflow-hidden border-border/60 bg-card p-6 transition-colors hover:border-border"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-surface-elevated">
                <r.icon className="h-5 w-5 text-brand" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.desc}</p>
              <Link
                to={r.href}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/90 hover:text-foreground"
              >
                {r.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const items = [
    {
      icon: Palette,
      title: "Website builder",
      desc: "Template-based editor. Change content, colors, and sections — instantly published.",
    },
    {
      icon: Calendar,
      title: "Registration forms",
      desc: "Custom fields, file uploads, team support, live desktop/tablet/mobile preview.",
    },
    {
      icon: Gavel,
      title: "Judging engine",
      desc: "Custom criteria, weighted scoring, judge assignments, and locked evaluations.",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      desc: "Registrations, submissions, judge progress. All in real time.",
    },
    {
      icon: ShieldCheck,
      title: "Role-based access",
      desc: "Hosts, judges, and participants get exactly the surface they need — nothing more.",
    },
    {
      icon: Users,
      title: "Participant portal",
      desc: "Submissions, announcements, and deadlines — scoped per event.",
    },
  ];

  return (
    <section id="features" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Everything you need
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              A complete event platform
            </h2>
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 md:grid-cols-3">
          {items.map((f) => (
            <div key={f.title} className="bg-card p-6">
              <f.icon className="h-5 w-5 text-brand" />
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-border/60 bg-surface/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-hero p-10 md:p-16">
          <div className="absolute inset-0 grid-bg pointer-events-none" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Ready to run your next event?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Spin up an event in under a minute. No credit card required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/events/create">
                <Button size="lg">
                  Create event
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth/host">
                <Button size="lg" variant="outline">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex items-center h-8">
            <img src="/favicon.png" alt="EVENT-HUB Logo" className="h-full w-auto object-contain" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">EVENT-HUB</span>
          <span className="font-mono text-xs">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6">
          <Link to="/auth/host" className="hover:text-foreground">
            Host
          </Link>
          <Link to="/auth/judge" className="hover:text-foreground">
            Judge
          </Link>
          <Link to="/auth/attender" className="hover:text-foreground">
            Attender
          </Link>
        </div>
      </div>
    </footer>
  );
}
