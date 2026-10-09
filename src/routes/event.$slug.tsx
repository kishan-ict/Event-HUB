import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RenderBlock, type Block } from "@/lib/website-blocks";
import { Button } from "@/components/ui/button";
import { Calendar, Megaphone, Pin, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading";

export const Route = createFileRoute("/event/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — EVENT-HUB` },
      { property: "og:title", content: `${params.slug}` },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EventPage,
  errorComponent: ({ reset }) => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Couldn't load this event</h1>
        <Button onClick={reset} className="mt-4">Try again</Button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Event not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm underline">Go home</Link>
      </div>
    </div>
  ),
});

function EventPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const { data: event, isLoading } = useQuery({
    queryKey: ["public-event", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if (data.is_published) return data;
      // Draft: only the host can preview.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && data.host_id === session.user.id) return data;
      } catch (e) {
        // Ignore auth errors on public event page
      }
      return null;
    },
  });

  const goRegister = async () => {
    const { data } = await (async () => { const { data: { session }, error } = await supabase.auth.getSession(); return { data: { user: session?.user ?? null }, error }; })();
    if (!data.user) {
      navigate({
        to: "/auth/participant",
        search: { redirect: `/events/${slug}/register` },
      });
    } else {
      navigate({ to: "/event/$slug/form/register", params: { slug } });
    }
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data === "register") {
        goRegister();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [slug, navigate]);

  if (isLoading) {
    return <LoadingScreen message="LOADING EVENT" />;
  }

  if (!event) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Not published
          </p>
          <h1 className="mt-2 text-2xl font-semibold">This event isn't public yet</h1>
          <Link to="/" className="mt-4 inline-block text-sm underline">Go home</Link>
        </div>
      </div>
    );
  }

  const isDraft = !event.is_published;

  const blocks = (event.website_blocks as unknown as Block[]) ?? [];
  const themeColor = event.theme_color ?? undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isDraft && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-2 text-center text-xs text-amber-900 dark:text-amber-200 shrink-0">
          Draft preview — only visible to you until you publish.
        </div>
      )}

      {/* If the event uses the new custom_code block, render it in a full-screen iframe */}
      {blocks.length === 1 && (blocks[0].type as string) === "custom_code" ? (
        <EventIframe html={(blocks[0] as any).html} name={event.name} />
      ) : (
        <>
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex items-center h-8">
                  <img src="/favicon.png" alt="EVENT-HUB Logo" className="h-full w-auto object-contain" />
                </div>
                <span className="text-sm font-semibold">{event.name}</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <Calendar className="h-3.5 w-3.5" />
                  {event.start_date} → {event.end_date}
                </div>
                <Button size="sm" onClick={goRegister} style={themeColor ? { backgroundColor: themeColor, color: "white" } : undefined}>
                  Register
                </Button>
              </div>
            </div>
          </header>

          {blocks.length === 0 ? (
            <section className="mx-auto max-w-3xl px-6 py-24 text-center">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
                {event.name}
              </h1>
              {event.description && (
                <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                  {event.description}
                </p>
              )}
              <Button
                className="mt-8"
                onClick={goRegister}
                style={themeColor ? { backgroundColor: themeColor, color: "white" } : undefined}
              >
                Register for {event.name}
              </Button>
            </section>
          ) : (
            blocks.map((b) => (
              <RenderBlock key={b.id} block={b} themeColor={themeColor} onCta={goRegister} />
            ))
          )}

          <AnnouncementsSection eventId={event.id} themeColor={themeColor} />

          <footer className="border-t border-border/60 px-6 py-8 text-center text-xs text-muted-foreground">
            Powered by EVENT-HUB
          </footer>
        </>
      )}
    </div>
  );
}

// EventIframe uses a simple srcDoc to render the HTML.
// The global CSP in _headers has been relaxed to allow Tailwind CDN and fonts.
function EventIframe({ html, name }: { html: string; name: string }) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative flex-1 flex flex-col">
      {loading && <LoadingScreen message="BUILDING PREVIEW" className="absolute" />}
      <iframe
        title={name}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin allow-popups"
        className="w-full flex-1 border-0 bg-white"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}

function AnnouncementsSection({
  eventId,
  themeColor,
}: {
  eventId: string;
  themeColor?: string;
}) {
  const { data } = useQuery({
    queryKey: ["public-announcements", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, pinned, created_at")
        .eq("event_id", eventId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!data || data.length === 0) return null;
  return (
    <section className="border-t border-border/60 bg-surface/20 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2
          className="mb-6 flex items-center gap-2 text-3xl font-semibold tracking-tight"
          style={themeColor ? { color: themeColor } : undefined}
        >
          <Megaphone className="h-6 w-6" /> Announcements
        </h2>
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-2">
                {a.pinned && (
                  <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {a.body}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
