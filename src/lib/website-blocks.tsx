import type { CSSProperties } from "react";

export type BlockType = "hero" | "about" | "schedule" | "sponsors" | "faq" | "cta";

export type ScheduleItem = { time: string; title: string; description?: string };
export type FaqItem = { q: string; a: string };
export type Sponsor = { name: string; tier?: string };

export type Block =
  | { id: string; type: "hero"; title: string; subtitle: string; ctaLabel: string }
  | { id: string; type: "about"; heading: string; body: string }
  | { id: string; type: "schedule"; heading: string; items: ScheduleItem[] }
  | { id: string; type: "sponsors"; heading: string; sponsors: Sponsor[] }
  | { id: string; type: "faq"; heading: string; items: FaqItem[] }
  | { id: string; type: "cta"; heading: string; body: string; ctaLabel: string };

export const BLOCK_LIBRARY: Array<{
  type: BlockType;
  label: string;
  description: string;
  create: () => Block;
}> = [
  {
    type: "hero",
    label: "Hero",
    description: "Big headline & CTA",
    create: () => ({
      id: crypto.randomUUID(),
      type: "hero",
      title: "Your event, front and center",
      subtitle: "A short, punchy tagline that captures why people should show up.",
      ctaLabel: "Register now",
    }),
  },
  {
    type: "about",
    label: "About",
    description: "Story / description",
    create: () => ({
      id: crypto.randomUUID(),
      type: "about",
      heading: "About the event",
      body: "Tell your audience what this event is about, who it's for, and what they'll take away.",
    }),
  },
  {
    type: "schedule",
    label: "Schedule",
    description: "Time-based agenda",
    create: () => ({
      id: crypto.randomUUID(),
      type: "schedule",
      heading: "Schedule",
      items: [
        { time: "9:00", title: "Kickoff", description: "Opening remarks" },
        { time: "10:00", title: "Session one" },
      ],
    }),
  },
  {
    type: "sponsors",
    label: "Sponsors",
    description: "Logos & tiers",
    create: () => ({
      id: crypto.randomUUID(),
      type: "sponsors",
      heading: "Our sponsors",
      sponsors: [
        { name: "Acme", tier: "Gold" },
        { name: "Globex", tier: "Silver" },
      ],
    }),
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Q & A",
    create: () => ({
      id: crypto.randomUUID(),
      type: "faq",
      heading: "Frequently asked",
      items: [
        { q: "Who can attend?", a: "Anyone interested — no prior experience required." },
      ],
    }),
  },
  {
    type: "cta",
    label: "CTA",
    description: "Closing call to action",
    create: () => ({
      id: crypto.randomUUID(),
      type: "cta",
      heading: "Ready to join?",
      body: "Save your spot in under a minute.",
      ctaLabel: "Register",
    }),
  },
];

export function RenderBlock({
  block,
  themeColor,
  onCta,
}: {
  block: Block;
  themeColor?: string;
  onCta?: () => void;
}) {
  const accent: CSSProperties = themeColor ? { color: themeColor } : {};
  const btn: CSSProperties = themeColor
    ? { backgroundColor: themeColor, color: "white" }
    : {};

  switch (block.type) {
    case "hero":
      return (
        <section className="relative overflow-hidden border-b border-border/60 px-6 py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: themeColor
                ? `radial-gradient(800px 400px at 50% -10%, ${themeColor}33, transparent 60%)`
                : undefined,
            }}
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              {block.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              {block.subtitle}
            </p>
            <button
              type="button"
              onClick={onCta}
              className="mt-8 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium shadow transition-opacity hover:opacity-90"
              style={btn}
            >
              {block.ctaLabel}
            </button>
          </div>
        </section>
      );
    case "about":
      return (
        <section className="border-b border-border/60 px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight" style={accent}>
              {block.heading}
            </h2>
            <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {block.body}
            </p>
          </div>
        </section>
      );
    case "schedule":
      return (
        <section className="border-b border-border/60 px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight" style={accent}>
              {block.heading}
            </h2>
            <div className="mt-6 space-y-3">
              {block.items.map((it, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-lg border border-border/60 bg-card p-4"
                >
                  <div className="w-16 shrink-0 font-mono text-sm text-muted-foreground">
                    {it.time}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{it.title}</div>
                    {it.description && (
                      <div className="text-sm text-muted-foreground">{it.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "sponsors":
      return (
        <section className="border-b border-border/60 px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight" style={accent}>
              {block.heading}
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {block.sponsors.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/60 bg-card px-6 py-4"
                >
                  <div className="font-semibold">{s.name}</div>
                  {s.tier && (
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {s.tier}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="border-b border-border/60 px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight" style={accent}>
              {block.heading}
            </h2>
            <div className="mt-6 space-y-3">
              {block.items.map((it, i) => (
                <details
                  key={i}
                  className="group rounded-lg border border-border/60 bg-card p-4"
                >
                  <summary className="cursor-pointer font-medium">{it.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{it.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      );
    case "cta":
      return (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card p-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight" style={accent}>
              {block.heading}
            </h2>
            <p className="mt-3 text-muted-foreground">{block.body}</p>
            <button
              type="button"
              onClick={onCta}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium shadow transition-opacity hover:opacity-90"
              style={btn}
            >
              {block.ctaLabel}
            </button>
          </div>
        </section>
      );
  }
}
