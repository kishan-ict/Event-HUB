import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  Image as ImageIcon,
  RotateCcw,
  Copy,
  Sparkles,
  ClipboardCopy,
  Undo2,
  Redo2,
  Save,
  Maximize2,
  Minimize2,
  Trash2,
  Braces,
  Plus,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/host/events/$id/website")({
  head: () => ({ meta: [{ title: "Website builder — EVENT-HUB" }] }),
  component: WebsiteBuilder,
});

type Viewport = "desktop" | "tablet" | "mobile";
const VP_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

const DEFAULT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Event Page</title>
<style>
* { margin: 0; box-sizing: border-box; font-family: system-ui, sans-serif; }
body { background: #0b0b12; color: #f5f5f7; }
.nav { display:flex; justify-content:space-between; align-items:center; padding:20px 32px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.brand { font-weight:700; font-size:18px; }
.cta { background:linear-gradient(135deg,#6366f1,#a855f7); color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:600; font-size: 14px; }
.hero { text-align: center; padding: 100px 20px; }
.hero h1 { font-size: 48px; margin-bottom: 20px; letter-spacing: -1px; }
.hero p { font-size: 18px; color: #a1a1aa; max-width: 600px; margin: 0 auto 40px; }
</style>
</head>
<body>
  <div class="nav">
    <div class="brand">My Event</div>
    <a href="#" class="cta" onclick="window.parent.postMessage('register', '*')">Register Now</a>
  </div>
  <div class="hero">
    <h1>Welcome to our event</h1>
    <p>Join us for an amazing experience full of learning, networking, and fun.</p>
  </div>
</body>
</html>`;

const MAX_HISTORY = 50;

const COUNTDOWN_SNIPPET = `<!-- Countdown Timer Section -->
<section class="py-12 px-6 text-center bg-white/[0.01] border-y border-white/5 relative z-10">
  <div class="max-w-xl mx-auto">
    <h3 class="text-lg font-bold mb-6 text-brand">Event Starts In</h3>
    <div id="countdown" class="grid grid-cols-4 gap-4 text-center">
      <div class="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
        <div id="cd-days" class="text-2xl sm:text-3xl font-extrabold text-white">00</div>
        <div class="text-[10px] uppercase text-slate-500 font-semibold mt-1">Days</div>
      </div>
      <div class="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
        <div id="cd-hours" class="text-2xl sm:text-3xl font-extrabold text-white">00</div>
        <div class="text-[10px] uppercase text-slate-500 font-semibold mt-1">Hours</div>
      </div>
      <div class="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
        <div id="cd-mins" class="text-2xl sm:text-3xl font-extrabold text-white">00</div>
        <div class="text-[10px] uppercase text-slate-500 font-semibold mt-1">Mins</div>
      </div>
      <div class="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
        <div id="cd-secs" class="text-2xl sm:text-3xl font-extrabold text-white">00</div>
        <div class="text-[10px] uppercase text-slate-500 font-semibold mt-1">Secs</div>
      </div>
    </div>
  </div>
  <script>
    (function() {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7); // Set to 7 days from now
      
      function updateTimer() {
        const now = new Date().getTime();
        const diff = targetDate.getTime() - now;
        if (diff <= 0) return;
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('cd-days').innerText = String(d).padStart(2, '0');
        document.getElementById('cd-hours').innerText = String(h).padStart(2, '0');
        document.getElementById('cd-mins').innerText = String(m).padStart(2, '0');
        document.getElementById('cd-secs').innerText = String(s).padStart(2, '0');
      }
      setInterval(updateTimer, 1000);
      updateTimer();
    })();
  </script>
</section>
`;

const FAQ_SNIPPET = `<!-- FAQ Section -->
<section class="py-16 px-6 max-w-3xl mx-auto relative z-10">
  <h2 class="text-2xl sm:text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
  <div class="space-y-4">
    <details class="group p-5 bg-white/[0.01] border border-white/5 rounded-xl [&_summary::-webkit-details-marker]:hidden">
      <summary class="flex justify-between items-center font-semibold cursor-pointer text-slate-200">
        <span>Who can participate in this event?</span>
        <span class="transition group-open:rotate-180 text-brand">&darr;</span>
      </summary>
      <p class="mt-3 text-sm text-slate-400 leading-relaxed">
        Anyone interested in learning and building is welcome! Whether you are a designer, developer, manager, or writer, there's a space for you.
      </p>
    </details>
    <details class="group p-5 bg-white/[0.01] border border-white/5 rounded-xl [&_summary::-webkit-details-marker]:hidden">
      <summary class="flex justify-between items-center font-semibold cursor-pointer text-slate-200">
        <span>How big can a team be?</span>
        <span class="transition group-open:rotate-180 text-brand">&darr;</span>
      </summary>
      <p class="mt-3 text-sm text-slate-400 leading-relaxed">
        Teams can consist of 1 to 4 members. You can form your team inside your Participant Portal once you register.
      </p>
    </details>
    <details class="group p-5 bg-white/[0.01] border border-white/5 rounded-xl [&_summary::-webkit-details-marker]:hidden">
      <summary class="flex justify-between items-center font-semibold cursor-pointer text-slate-200">
        <span>Is there a registration fee?</span>
        <span class="transition group-open:rotate-180 text-brand">&darr;</span>
      </summary>
      <p class="mt-3 text-sm text-slate-400 leading-relaxed">
        No, this event is 100% free of charge for all registered participants.
      </p>
    </details>
  </div>
</section>
`;

const SPONSORS_SNIPPET = `<!-- Sponsors Section -->
<section class="py-16 px-6 text-center relative z-10 border-t border-white/5">
  <div class="max-w-4xl mx-auto">
    <h2 class="text-xs uppercase tracking-widest text-slate-500 font-bold mb-8">Supported & Sponsored By</h2>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-8 items-center opacity-65">
      <div class="p-4 bg-white/[0.01] border border-white/5 rounded-lg flex items-center justify-center h-16 font-bold text-slate-400 hover:text-white transition-colors cursor-default">
        ALPHA CO
      </div>
      <div class="p-4 bg-white/[0.01] border border-white/5 rounded-lg flex items-center justify-center h-16 font-bold text-slate-400 hover:text-white transition-colors cursor-default">
        BETA CORP
      </div>
      <div class="p-4 bg-white/[0.01] border border-white/5 rounded-lg flex items-center justify-center h-16 font-bold text-slate-400 hover:text-white transition-colors cursor-default">
        GAMMA LABS
      </div>
      <div class="p-4 bg-white/[0.01] border border-white/5 rounded-lg flex items-center justify-center h-16 font-bold text-slate-400 hover:text-white transition-colors cursor-default">
        DELTA TECH
      </div>
    </div>
  </div>
</section>
`;

const SPEAKERS_SNIPPET = `<!-- Speakers Section -->
<section class="py-16 px-6 max-w-5xl mx-auto relative z-10">
  <h2 class="text-2xl sm:text-3xl font-bold text-center mb-10">Speakers & Mentors</h2>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="p-6 bg-white/[0.01] border border-white/5 rounded-2xl text-center group hover:border-brand/40 transition-all">
      <div class="h-20 w-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-2xl font-bold mb-4">
        JD
      </div>
      <h3 class="font-bold text-lg">Jane Doe</h3>
      <p class="text-xs text-brand mt-0.5">Lead Architect at CloudScale</p>
      <p class="text-xs text-slate-500 mt-3 leading-relaxed">Expert in distributed databases, hosting models, and cloud-native scaling strategies.</p>
    </div>
    <div class="p-6 bg-white/[0.01] border border-white/5 rounded-2xl text-center group hover:border-brand/40 transition-all">
      <div class="h-20 w-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-2xl font-bold mb-4">
        JS
      </div>
      <h3 class="font-bold text-lg">John Smith</h3>
      <p class="text-xs text-brand mt-0.5">Head of AI at FutureTech</p>
      <p class="text-xs text-slate-500 mt-3 leading-relaxed">Focuses on machine learning models, system architecture, and client-side web integrations.</p>
    </div>
    <div class="p-6 bg-white/[0.01] border border-white/5 rounded-2xl text-center group hover:border-brand/40 transition-all">
      <div class="h-20 w-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-2xl font-bold mb-4">
        AL
      </div>
      <h3 class="font-bold text-lg">Alex Lee</h3>
      <p class="text-xs text-brand mt-0.5">UI/UX Designer at PixelCraft</p>
      <p class="text-xs text-slate-500 mt-3 leading-relaxed">Dedicated to micro-animations, interaction guidelines, and stunning dark mode aesthetics.</p>
    </div>
  </div>
</section>
`;

// LivePreview implements a flicker-free, real-time Tailwind rendering engine via postMessage
// LivePreview uses a debounced document.write() into a same-origin CSP-relaxed iframe.
// This guarantees that Tailwind initializes with the user's custom config and fonts exactly as a real page would.
function LivePreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [debouncedHtml, setDebouncedHtml] = useState(html);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHtml(html), 700);
    return () => clearTimeout(timer);
  }, [html]);

  useEffect(() => {
    if (isReady && iframeRef.current?.contentDocument) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(debouncedHtml);
      doc.close();
    }
  }, [debouncedHtml, isReady]);

  return (
    <iframe
      ref={iframeRef}
      src="/preview.html"
      sandbox="allow-scripts allow-same-origin allow-popups"
      className="w-full h-full border-0 bg-white"
      title="Live Preview"
      onLoad={() => setIsReady(true)}
    />
  );
}

function WebsiteBuilder() {
  const { id } = Route.useParams();
  const [html, setHtml] = useState<string>("");
  const [debouncedHtml, setDebouncedHtml] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const previewRef = useRef<HTMLIFrameElement>(null);

  // Use the new LivePreview component which handles debouncing natively without tearing down the iframe.
  // We still debounce the raw input to prevent spamming postMessage too heavily, but we can make it super fast (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedHtml(html);
    }, 300);
    return () => clearTimeout(t);
  }, [html]);

  // Memoize line count so we don't split a huge string on every render
  const lineCount = useMemo(() => Math.max(html.split("\n").length, 1), [html]);

  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [bannerProgress, setBannerProgress] = useState("");
  const [logoProgress, setLogoProgress] = useState("");
  const [bannerLiveCountdown, setBannerLiveCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (bannerLiveCountdown !== null && bannerLiveCountdown > 0) {
      const t = setTimeout(() => setBannerLiveCountdown(c => (c !== null && c > 0) ? c - 1 : 0), 1000);
      return () => clearTimeout(t);
    } else if (bannerLiveCountdown === 0) {
      toast.success("Banner is now fully updated across all platforms!", { duration: 5000 });
      setBannerLiveCountdown(null);
    }
  }, [bannerLiveCountdown]);

  // Auto-save
  const [autoSave, setAutoSave] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // Undo / Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);

  // Code Editor states and refs
  const [isMaximized, setIsMaximized] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineGutterRef.current) {
      lineGutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = html.substring(0, start) + "  " + html.substring(end);
      setHtml(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const formatCode = () => {
    try {
      let indentLevel = 0;
      const formattedLines = html
        .split("\n")
        .map((line) => {
          let trimmed = line.trim();
          if (!trimmed) return "";

          if (trimmed.startsWith("</") || trimmed.startsWith("}") || trimmed.startsWith("</html")) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          const spacedLine = "  ".repeat(indentLevel) + trimmed;

          if (
            (trimmed.startsWith("<") &&
              !trimmed.startsWith("</") &&
              !trimmed.endsWith("/>") &&
              !trimmed.startsWith("<!") &&
              !trimmed.includes("meta") &&
              !trimmed.includes("link") &&
              !trimmed.includes("br") &&
              !trimmed.includes("img")) ||
            trimmed.endsWith("{")
          ) {
            indentLevel++;
          }

          return spacedLine;
        })
        .join("\n");

      setHtml(formattedLines);
      toast.success("Code formatted");
    } catch {
      toast.error("Failed to format code");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(html);
    toast.success("Code copied to clipboard");
  };

  const clearCode = () => {
    if (confirm("Are you sure you want to clear the editor?")) {
      setHtml("");
      toast.success("Editor cleared");
    }
  };

  const [showBlocks, setShowBlocks] = useState(false);

  const insertCodeSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentHtml = html;

    const newHtml = currentHtml.substring(0, start) + snippet + currentHtml.substring(end);
    setHtml(newHtml);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    }, 0);

    toast.success("Block inserted at cursor");
  };

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: event, isLoading, refetch } = useQuery({
    queryKey: ["event-website", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, theme_color, website_blocks, is_published, banner_url, logo_url")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (event) {
      setBannerUrl(event.banner_url);
      setLogoUrl(event.logo_url);

      const blocks = event.website_blocks as any[] ?? [];
      const customCodeBlock = blocks.find(b => b.type === "custom_code");
      const initialHtml = customCodeBlock?.html ?? DEFAULT_HTML;
      setHtml(initialHtml);
      // Initialize history with the loaded code
      setHistory([initialHtml]);
      setHistoryIndex(0);
      isInitialLoad.current = true;
    }
  }, [event]);

  // Push to undo history when html changes (not from undo/redo)
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      const next = [...truncated, html];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  function undo() {
    if (!canUndo) return;
    isUndoRedo.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setHtml(history[newIndex]);
  }

  function redo() {
    if (!canRedo) return;
    isUndoRedo.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setHtml(history[newIndex]);
  }

  // Silent save (for auto-save, no toast)
  const silentSave = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          banner_url: bannerUrl,
          logo_url: logoUrl,
          website_blocks: [{ id: "custom-code-1", type: "custom_code", html }]
        } as never)
        .eq("id", id);
      if (error) throw error;
      setLastSavedAt(new Date());
    } catch {
      // silent fail for auto-save
    } finally {
      setSaving(false);
    }
  }, [html, bannerUrl, logoUrl, id]);

  // Auto-save debounce (2 seconds after last change)
  useEffect(() => {
    if (!autoSave || isInitialLoad.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      silentSave();
    }, 2000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [html, autoSave, silentSave]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          banner_url: bannerUrl,
          logo_url: logoUrl,
          website_blocks: [{ id: "custom-code-1", type: "custom_code", html }]
        } as never)
        .eq("id", id);
      if (error) throw error;
      setLastSavedAt(new Date());
      toast.success("Website saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    setPublishing(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          banner_url: bannerUrl,
          logo_url: logoUrl,
          website_blocks: [{ id: "custom-code-1", type: "custom_code", html }],
          is_published: !event!.is_published
        } as never)
        .eq("id", id);
      if (error) throw error;
      toast.success(event!.is_published ? "Unpublished" : "Published");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPublishing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: "banner" | "logo") {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    if (type === "banner") {
      setUploadingBanner(true);
      setBannerProgress("Compressing... 0%");
    } else {
      setUploadingLogo(true);
      setLogoProgress("Compressing... 0%");
    }

    const setProgress = (text: string) => {
      if (type === "banner") setBannerProgress(text);
      else setLogoProgress(text);
    };

    try {
      const { compressImage } = await import('@/lib/image-compressor');
      
      const file = await compressImage(originalFile, 250, (percent) => {
        setProgress(`Compressing... ${percent}%`);
      });

      setProgress(`Uploading... 90%`);

      const fileExt = file.name.split('.').pop();
      const fileName = `${id}_${type}_${Math.random()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('events') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(`Finalizing... 100%`);

      const { data: { publicUrl } } = supabase.storage.from('events').getPublicUrl(filePath);

      if (type === "banner") {
        const isUpdate = !!bannerUrl;
        setBannerUrl(publicUrl);
        await supabase.from("events").update({ banner_url: publicUrl } as never).eq("id", id);
        
        if (isUpdate) {
          setBannerLiveCountdown(300);
          toast.success("Banner updated! Check the countdown for social media availability.");
        } else {
          toast.success("Banner uploaded! You can check it live now.");
        }
      } else {
        setLogoUrl(publicUrl);
        await supabase.from("events").update({ logo_url: publicUrl } as never).eq("id", id);
        toast.success("Logo uploaded and optimized!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      if (type === "banner") {
        setUploadingBanner(false);
        setBannerProgress("");
      } else {
        setUploadingLogo(false);
        setLogoProgress("");
      }

      if (e.target) e.target.value = '';
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Website Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste your full page code in one place and publish to your event URL.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-block rounded bg-surface-elevated px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {event?.is_published ? "Live" : "Draft"}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
              <span className="truncate max-w-[120px] sm:max-w-[200px]">/event/{event?.slug}</span>
              <a href={`/event/${event?.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center hover:text-foreground shrink-0">
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://event-aleropath.pages.dev/event/${event?.slug}`);
                  toast.success("URL copied to clipboard");
                }}
                className="inline-flex items-center hover:text-foreground text-muted-foreground transition-colors shrink-0"
                title="Copy URL"
              >
                <Copy className="h-3 w-3" />
              </button>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          {/* Auto-save toggle */}
          <label className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium bg-surface/50 shrink-0">
            <Switch checked={autoSave} onCheckedChange={setAutoSave} />
            <span className="whitespace-nowrap text-xs">Auto-save</span>
          </label>
          {lastSavedAt && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
              Saved {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
          <WebsitePromptButton slug={event?.slug ?? ""} id={event?.id ?? ""} onApplyHtml={(compiledHtml) => setHtml(compiledHtml)} />
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => {
            if (confirm("Reset to default template? This will erase your current code.")) {
              setHtml(DEFAULT_HTML);
            }
          }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Template
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90 flex-1 sm:flex-none" onClick={togglePublish} disabled={publishing}>
            {event?.is_published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/60 bg-card p-5 relative overflow-hidden">
            <h3 className="font-semibold">Banner image</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Wide hero image shown on the event page.</p>
            <div className="flex gap-4 items-center">
              <div className="h-16 w-24 rounded-md border border-dashed border-border/60 flex items-center justify-center bg-surface/50 overflow-hidden">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <input
                type="file"
                className="hidden"
                ref={bannerInputRef}
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "banner")}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
              >
                {uploadingBanner ? (bannerProgress || "Uploading...") : "Upload"}
              </Button>
            </div>
            {bannerLiveCountdown !== null && (
              <div className="mt-4 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-amber-500/90 font-medium">
                  Live across social media in {Math.floor(bannerLiveCountdown / 60)}:{(bannerLiveCountdown % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold">Logo</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Square logo for the event header.</p>
            <div className="flex gap-4 items-center">
              <div className="h-16 w-16 rounded-md border border-dashed border-border/60 flex items-center justify-center bg-surface/50 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <input
                type="file"
                className="hidden"
                ref={logoInputRef}
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "logo")}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (logoProgress || "Uploading...") : "Upload"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:h-[600px]">
          <div className={`order-2 lg:order-1 flex flex-col rounded-xl border border-border/60 bg-[#1e1e1e] overflow-hidden transition-all ${isMaximized
              ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none"
              : "h-[450px] lg:h-auto"
            }`}>
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-[#d4d4d4] text-xs font-mono border-b border-[#404040]">
              <span className="flex items-center gap-1.5">
                <Braces className="h-3.5 w-3.5 text-brand" />
                &lt;/&gt; Code Editor {isMaximized && "(Fullscreen Mode)"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowBlocks(!showBlocks)}
                  className={`flex items-center h-7 px-2 place-items-center rounded transition-colors ${showBlocks ? "bg-brand/20 text-brand hover:bg-brand/30" : "hover:bg-[#404040] text-[#d4d4d4]"
                    }`}
                  title="Insert HTML Components"
                >
                  <Plus className="h-3.5 w-3.5 mr-1 inline" /> Blocks
                </button>

                <button
                  type="button"
                  onClick={formatCode}
                  className="flex items-center h-7 px-2 place-items-center rounded hover:bg-[#404040] text-[#d4d4d4] transition-colors"
                  title="Format HTML Code"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 inline" /> Format
                </button>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center h-7 px-2 place-items-center rounded hover:bg-[#404040] text-[#d4d4d4] transition-colors"
                  title="Copy to Clipboard"
                >
                  <Copy className="h-3.5 w-3.5 mr-1 inline" /> Copy
                </button>

                <span className="w-px h-4 bg-[#404040] mx-1" />

                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  className={`grid h-7 w-7 place-items-center rounded transition-colors ${canUndo ? "hover:bg-[#404040] text-[#d4d4d4]" : "text-[#555] cursor-not-allowed"
                    }`}
                  title="Undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  className={`grid h-7 w-7 place-items-center rounded transition-colors ${canRedo ? "hover:bg-[#404040] text-[#d4d4d4]" : "text-[#555] cursor-not-allowed"
                    }`}
                  title="Redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>

                <span className="w-px h-4 bg-[#404040] mx-1" />

                <button
                  type="button"
                  onClick={clearCode}
                  className="grid h-7 w-7 place-items-center rounded hover:bg-[#404040] text-red-400 transition-colors"
                  title="Clear Editor"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="grid h-7 w-7 place-items-center rounded hover:bg-[#404040] text-[#d4d4d4] transition-colors"
                  title={isMaximized ? "Exit Fullscreen" : "Fullscreen Editor"}
                >
                  {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>

                {autoSave && saving && (
                  <span className="ml-2 text-[10px] text-emerald-400 animate-pulse hidden sm:inline">saving…</span>
                )}
              </div>
            </div>

            <div className="flex-1 flex bg-[#1e1e1e] overflow-hidden relative">
              {showBlocks && (
                <div className="w-56 bg-[#161616] border-r border-[#333] flex flex-col p-3 space-y-3 overflow-y-auto shrink-0 select-none">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-1">
                    Insert Component
                  </div>

                  <button
                    onClick={() => insertCodeSnippet(COUNTDOWN_SNIPPET)}
                    className="flex flex-col text-left p-2.5 rounded-lg border border-[#333] hover:border-brand/40 bg-[#1e1e1e] hover:bg-[#2d2d2d] group transition-all"
                  >
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-brand flex items-center gap-1.5">
                      ⏳ Countdown Timer
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Live client-side timer widget.</span>
                  </button>

                  <button
                    onClick={() => insertCodeSnippet(FAQ_SNIPPET)}
                    className="flex flex-col text-left p-2.5 rounded-lg border border-[#333] hover:border-brand/40 bg-[#1e1e1e] hover:bg-[#2d2d2d] group transition-all"
                  >
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-brand flex items-center gap-1.5">
                      ❓ FAQ Accordion
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Expandable question panel.</span>
                  </button>

                  <button
                    onClick={() => insertCodeSnippet(SPONSORS_SNIPPET)}
                    className="flex flex-col text-left p-2.5 rounded-lg border border-[#333] hover:border-brand/40 bg-[#1e1e1e] hover:bg-[#2d2d2d] group transition-all"
                  >
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-brand flex items-center gap-1.5">
                      🤝 Sponsors Grid
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Clean grid for company logos.</span>
                  </button>

                  <button
                    onClick={() => insertCodeSnippet(SPEAKERS_SNIPPET)}
                    className="flex flex-col text-left p-2.5 rounded-lg border border-[#333] hover:border-brand/40 bg-[#1e1e1e] hover:bg-[#2d2d2d] group transition-all"
                  >
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-brand flex items-center gap-1.5">
                      🎙️ Speaker Grid
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">Profile cards for mentors/speakers.</span>
                  </button>
                </div>
              )}

              <div
                ref={lineGutterRef}
                className="w-10 bg-[#161616] text-[#555] text-right pr-2 py-4 font-mono text-xs select-none border-r border-[#333] overflow-hidden whitespace-pre pointer-events-none"
                style={{ lineHeight: "1.5rem" }}
              >
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="h-[1.5rem] pr-1">{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent p-4 text-[#d4d4d4] font-mono text-sm resize-none focus:outline-none overflow-y-auto leading-[1.5rem]"
                style={{ lineHeight: "1.5rem" }}
                placeholder="<!doctype html>..."
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                onScroll={handleTextareaScroll}
                onKeyDown={handleKeyDown}
                spellCheck={false}
              />
            </div>
          </div>
          <div className="order-1 lg:order-2 flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden h-[400px] lg:h-auto">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-surface/50">
              <span className="text-sm font-medium">Live preview</span>
              <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5 bg-background">
                <ViewportBtn active={viewport === "desktop"} onClick={() => setViewport("desktop")} icon={Monitor} />
                <ViewportBtn active={viewport === "tablet"} onClick={() => setViewport("tablet")} icon={Tablet} />
                <ViewportBtn active={viewport === "mobile"} onClick={() => setViewport("mobile")} icon={Smartphone} />
              </div>
            </div>
            <div className="flex-1 bg-surface/10 p-6 flex items-center justify-center overflow-auto relative">
              <div
                className="w-full h-full overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm transition-all relative"
                style={{ maxWidth: VP_WIDTH[viewport] }}
              >
                <LivePreview html={debouncedHtml} />
                {!debouncedHtml && !html && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-sm bg-background">
                    Live preview renders here
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewportBtn({
  active,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid h-7 w-8 place-items-center rounded ${active ? "bg-surface-elevated text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* ─── Website Prompt Dialog ─── */

interface PromptFormData {
  eventName: string;
  tagline: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  description: string;
  themeColor: string;
  designStyle: string;
  customStyle: string;
  additionalDetails: string;
}

const EMPTY_FORM: PromptFormData = {
  eventName: "",
  tagline: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  venue: "",
  description: "",
  themeColor: "#6366f1",
  designStyle: "",
  customStyle: "",
  additionalDetails: "",
};

const DESIGN_STYLES = [
  { id: "cyber", label: "Cyber / Neon", emoji: "⚡", desc: "Dark background, neon glows, futuristic vibes" },
  { id: "luxury", label: "Luxury / Elegant", emoji: "✨", desc: "Gold accents, serif fonts, premium feel" },
  { id: "minimal", label: "Minimal / Clean", emoji: "◻️", desc: "Whitespace, simple typography, subtle" },
  { id: "retro", label: "Retro / Vintage", emoji: "📻", desc: "Warm tones, retro fonts, nostalgic" },
  { id: "glass", label: "Glassmorphism", emoji: "🔮", desc: "Frosted glass, blur effects, translucent" },
  { id: "bold", label: "Bold / Colorful", emoji: "🎨", desc: "Vibrant gradients, big text, energetic" },
  { id: "corporate", label: "Corporate / Pro", emoji: "🏢", desc: "Professional, structured, trustworthy" },
  { id: "nature", label: "Nature / Organic", emoji: "🌿", desc: "Earth tones, natural textures, calming" },
] as const;

function WebsitePromptButton({
  slug,
  id,
  onApplyHtml
}: {
  slug: string;
  id: string;
  onApplyHtml: (compiledHtml: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PromptFormData>(EMPTY_FORM);
  const [copied, setCopied] = useState(false);

  function update<K extends keyof PromptFormData>(key: K, value: PromptFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://event-aleropath.pages.dev";
  const registrationLink = `${origin}/event/${slug}/form/register`;
  const workspaceLink = `${origin}/dashboard/participant/events/${id}/info`;
  const announcementsLink = `${origin}/dashboard/participant/events/${id}/announcements`;
  const teamLink = `${origin}/dashboard/participant/events/${id}/team`;
  const submissionsLink = `${origin}/dashboard/participant/events/${id}/submissions`;
  const scheduleLink = `${origin}/dashboard/participant/events/${id}/schedule`;

  function compileHtmlTemplate(): string {
    const brandColor = form.themeColor || "#6366f1";
    const name = form.eventName || "Epic Event";
    const tag = form.tagline || "Co-create the future of technology.";
    const desc = form.description || "Join creators, developers, and visionaries from around the globe for an intense, rewarding experience filled with networking, builds, and mentorship.";
    const dateStr = [form.startDate, form.endDate].filter(Boolean).join(" to ") || "Coming Soon";
    const timeStr = [form.startTime, form.endTime].filter(Boolean).join(" – ") || "All Day";
    const loc = form.venue || "Global (Virtual)";
    const style = form.designStyle || "cyber";

    let bodyClass = "bg-[#0b0b12] text-[#f5f5f7]";
    let fontLink = '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Outfit:wght@400;600;800&family=Playfair+Display:ital,wght@0,600;1,400&family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;600;800&family=Lora:ital,wght@0,500;1,400&display=swap" rel="stylesheet">';
    let fontStyle = "font-family: 'Outfit', sans-serif;";
    let heroBg = "bg-gradient-to-b from-brand/10 via-transparent to-transparent";
    let extraCss = "";

    switch (style) {
      case "cyber":
        fontStyle = "font-family: 'Space Grotesk', sans-serif;";
        bodyClass = "bg-[#05050a] text-[#e0e0ea] selection:bg-brand/30 selection:text-white";
        heroBg = "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/20 via-[#05050a] to-[#05050a]";
        extraCss = `
          .neon-border { border-color: ${brandColor}; box-shadow: 0 0 10px ${brandColor}40, inset 0 0 10px ${brandColor}20; }
          .neon-text { text-shadow: 0 0 8px ${brandColor}80; }
        `;
        break;
      case "luxury":
        fontStyle = "font-family: 'Outfit', sans-serif;";
        bodyClass = "bg-[#0f0f0f] text-[#ebdcb9] selection:bg-[#ebdcb9]/20";
        heroBg = "bg-gradient-to-b from-[#ebdcb9]/5 via-transparent to-transparent";
        extraCss = `
          h1, h2, h3 { font-family: 'Playfair Display', serif; color: #ebdcb9 !important; }
          .lux-border { border-color: rgba(235, 220, 185, 0.2); }
          .btn-lux { background: linear-gradient(135deg, #ebdcb9, #bfa36c); color: #0f0f0f; font-weight: 600; }
        `;
        break;
      case "minimal":
        fontStyle = "font-family: 'Plus Jakarta Sans', sans-serif;";
        bodyClass = "bg-[#fafafa] text-[#18181b] selection:bg-brand/10 selection:text-brand";
        heroBg = "bg-[radial-gradient(40%_40%_at_50%_10%,_var(--tw-gradient-stops))] from-brand/5 via-transparent to-transparent";
        extraCss = `
          .minimal-shadow { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05); }
        `;
        break;
      case "retro":
        fontStyle = "font-family: 'Space Grotesk', sans-serif;";
        bodyClass = "bg-[#f4efe6] text-[#2d2219] selection:bg-brand/20";
        heroBg = "bg-transparent";
        extraCss = `
          h1, h2, h3 { font-family: 'Syne', sans-serif; font-weight: 800; }
          .retro-box { border: 3px solid #2d2219; box-shadow: 4px 4px 0px #2d2219; }
          .btn-retro { border: 3px solid #2d2219; background-color: ${brandColor}; color: white; box-shadow: 3px 3px 0px #2d2219; transition: all 0.1s ease; }
          .btn-retro:hover { transform: translate(2px, 2px); box-shadow: 1px 1px 0px #2d2219; }
        `;
        break;
      case "glass":
        fontStyle = "font-family: 'Outfit', sans-serif;";
        bodyClass = "bg-[#0b0816] text-white selection:bg-brand/30";
        heroBg = "bg-gradient-to-tr from-[#05030a] via-[#0f0926] to-[#05030a]";
        extraCss = `
          .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
          .glass-card { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s ease; }
          .glass-card:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.12); transform: translateY(-2px); }
          .glow-blob { filter: blur(100px); opacity: 0.15; animation: pulse-blob 8s infinite alternate; }
          @keyframes pulse-blob { 0% { transform: scale(1) translate(0, 0); } 100% { transform: scale(1.2) translate(10px, 20px); } }
        `;
        break;
      case "bold":
        fontStyle = "font-family: 'Outfit', sans-serif;";
        bodyClass = "bg-[#07070a] text-white selection:bg-brand/30";
        heroBg = "bg-gradient-to-br from-brand/20 via-transparent to-transparent";
        extraCss = `
          h1, h2, h3 { font-family: 'Syne', sans-serif; font-weight: 800; text-transform: uppercase; }
          .bold-gradient { background: linear-gradient(135deg, ${brandColor}, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .bold-border { border: 2px solid ${brandColor}; }
        `;
        break;
      case "corporate":
        fontStyle = "font-family: 'Plus Jakarta Sans', sans-serif;";
        bodyClass = "bg-slate-900 text-slate-100 selection:bg-brand/20";
        heroBg = "bg-gradient-to-b from-brand/10 via-transparent to-slate-900";
        extraCss = `
          .corp-card { background-color: #1e293b; border: 1px solid #334155; }
        `;
        break;
      case "nature":
        fontStyle = "font-family: 'Lora', serif;";
        bodyClass = "bg-[#f8f6f2] text-[#1c2e24] selection:bg-[#2b4c37]/10 selection:text-[#2b4c37]";
        heroBg = "bg-gradient-to-b from-[#2b4c37]/5 via-transparent to-transparent";
        extraCss = `
          h1, h2, h3 { font-family: 'Lora', serif; font-style: italic; color: #2b4c37; }
          .nature-border { border-color: rgba(43, 76, 55, 0.15); }
          .btn-nature { background-color: #2b4c37; color: #f8f6f2; transition: background 0.2s; }
          .btn-nature:hover { background-color: #1e3526; }
        `;
        break;
    }

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name}</title>
  ${fontLink}
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              DEFAULT: '${brandColor}',
              hover: '${brandColor}dd',
            }
          }
        }
      }
    }
  </script>
  <style>
    * { margin: 0; box-sizing: border-box; }
    body { ${fontStyle} transition: background-color 0.3s; scroll-behavior: smooth; }
    ${extraCss}
  </style>
</head>
<body class="${bodyClass}">

  <!-- Animated Glowing Blobs (for Glass / Neon themes) -->
  ${style === "glass" ? `
  <div class="fixed top-0 inset-x-0 h-full overflow-hidden pointer-events-none z-0">
    <div class="absolute top-[-10%] left-[20%] w-[350px] h-[350px] bg-brand glow-blob rounded-full"></div>
    <div class="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] bg-purple-500 glow-blob rounded-full"></div>
  </div>
  ` : ''}

  <!-- Header / Navigation -->
  <header class="relative z-10 border-b border-white/5 py-4 px-6 sm:px-12 backdrop-blur-md bg-transparent">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl font-bold tracking-tight text-brand neon-text">${name}</span>
      </div>
      <nav class="hidden md:flex items-center gap-6 text-sm">
        <a href="#about" class="hover:text-brand transition-colors">About</a>
        <a href="#schedule" class="hover:text-brand transition-colors">Schedule</a>
        <a href="#workspace" class="hover:text-brand transition-colors">Workspace</a>
      </nav>
      <div>
        <a href="${registrationLink}" class="inline-block py-2.5 px-6 rounded-lg text-sm font-semibold transition-all ${style === "retro" ? "btn-retro" : style === "nature" ? "btn-nature" : style === "luxury" ? "btn-lux" : "bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98]"
      }">Register Now</a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative z-10 py-20 px-6 sm:px-12 ${heroBg}">
    <div class="max-w-4xl mx-auto text-center space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/20 bg-brand/5 text-xs text-brand font-mono font-medium neon-text">
        <span class="h-1.5 w-1.5 rounded-full bg-brand animate-ping"></span>
        Registration open
      </div>
      <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none ${style === 'bold' ? 'bold-gradient' : ''}">
        ${name}
      </h1>
      <p class="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed ${style === 'nature' ? 'text-slate-600' : ''}">
        ${tag}
      </p>
      
      <!-- Event Info Badges -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6 text-sm">
        <div class="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm flex flex-col items-center ${style === 'retro' ? 'retro-box' : style === 'minimal' ? 'minimal-shadow bg-white' : ''}">
          <span class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">📅 Date</span>
          <span class="font-bold">${dateStr}</span>
        </div>
        <div class="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm flex flex-col items-center ${style === 'retro' ? 'retro-box' : style === 'minimal' ? 'minimal-shadow bg-white' : ''}">
          <span class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">🕒 Time</span>
          <span class="font-bold">${timeStr}</span>
        </div>
        <div class="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm flex flex-col items-center ${style === 'retro' ? 'retro-box' : style === 'minimal' ? 'minimal-shadow bg-white' : ''}">
          <span class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">📍 Venue</span>
          <span class="font-bold">${loc}</span>
        </div>
      </div>

      <div class="pt-8">
        <a href="${registrationLink}" class="inline-block py-4 px-8 rounded-xl text-base font-semibold shadow-xl transition-all ${style === "retro" ? "btn-retro" : style === "nature" ? "btn-nature" : style === "luxury" ? "btn-lux" : "bg-brand hover:bg-brand-hover text-white shadow-brand/20 hover:scale-[1.03] active:scale-[0.97]"
      }">Secure Your Spot</a>
      </div>
    </div>
  </section>

  <!-- About / Description Section -->
  <section id="about" class="relative z-10 py-16 px-6 sm:px-12 border-t border-white/5">
    <div class="max-w-3xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-6">About the Event</h2>
      <p class="text-base leading-relaxed text-slate-400 ${style === 'nature' ? 'text-slate-700' : ''}">
        ${desc}
      </p>
      ${form.additionalDetails ? `
      <div class="mt-8 p-6 rounded-xl border border-white/5 bg-white/[0.01] ${style === 'retro' ? 'retro-box' : style === 'minimal' ? 'minimal-shadow bg-white' : ''}">
        <h3 class="text-lg font-bold mb-3">Additional Details</h3>
        <p class="text-sm text-slate-400 leading-relaxed ${style === 'nature' ? 'text-slate-600' : ''}">${form.additionalDetails}</p>
      </div>
      ` : ''}
    </div>
  </section>

  <!-- Participant Portal Hub Section -->
  <section id="workspace" class="relative z-10 py-16 px-6 sm:px-12 border-t border-white/5 bg-white/[0.01]">
    <div class="max-w-6xl mx-auto">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">Participant Portal</h2>
        <p class="text-sm text-slate-400 mt-2">Manage your registration, access event schedules, view team invitations, and submit assignments directly.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <a href="${workspaceLink}" class="p-6 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between hover:border-brand/40 group transition-all hover:-translate-y-1 ${style === 'retro' ? 'retro-box bg-[#f4efe6]' : style === 'minimal' ? 'minimal-shadow bg-white' : style === 'glass' ? 'glass-card' : ''
      }">
          <div>
            <div class="text-xl mb-3">💻</div>
            <h3 class="font-bold text-lg group-hover:text-brand transition-colors">Workspace Info</h3>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">View registration summary and access project resources.</p>
          </div>
          <span class="text-xs font-semibold text-brand mt-4 inline-flex items-center gap-1">Open Dashboard &rarr;</span>
        </a>

        <a href="${scheduleLink}" class="p-6 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between hover:border-brand/40 group transition-all hover:-translate-y-1 ${style === 'retro' ? 'retro-box bg-[#f4efe6]' : style === 'minimal' ? 'minimal-shadow bg-white' : style === 'glass' ? 'glass-card' : ''
      }">
          <div>
            <div class="text-xl mb-3">📅</div>
            <h3 class="font-bold text-lg group-hover:text-brand transition-colors">Schedule & Deadlines</h3>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">Keep track of key dates, timelines, and program events.</p>
          </div>
          <span class="text-xs font-semibold text-brand mt-4 inline-flex items-center gap-1">Open Schedule &rarr;</span>
        </a>

        <a href="${teamLink}" class="p-6 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between hover:border-brand/40 group transition-all hover:-translate-y-1 ${style === 'retro' ? 'retro-box bg-[#f4efe6]' : style === 'minimal' ? 'minimal-shadow bg-white' : style === 'glass' ? 'glass-card' : ''
      }">
          <div>
            <div class="text-xl mb-3">👥</div>
            <h3 class="font-bold text-lg group-hover:text-brand transition-colors">Team Setup & Invites</h3>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">Create team entries, invite teammates, and manage members.</p>
          </div>
          <span class="text-xs font-semibold text-brand mt-4 inline-flex items-center gap-1">Manage Team &rarr;</span>
        </a>

        <a href="${submissionsLink}" class="p-6 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between hover:border-brand/40 group transition-all hover:-translate-y-1 ${style === 'retro' ? 'retro-box bg-[#f4efe6]' : style === 'minimal' ? 'minimal-shadow bg-white' : style === 'glass' ? 'glass-card' : ''
      }">
          <div>
            <div class="text-xl mb-3">🚀</div>
            <h3 class="font-bold text-lg group-hover:text-brand transition-colors">Project Submission</h3>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">Submit your project repositories, slides, or links for evaluation.</p>
          </div>
          <span class="text-xs font-semibold text-brand mt-4 inline-flex items-center gap-1">Submit Project &rarr;</span>
        </a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="relative z-10 py-12 px-6 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="font-semibold text-slate-400">${name}</div>
      <div>&copy; ${new Date().getFullYear()} ${name}. Powered by EVENT-HUB.</div>
    </div>
  </footer>

</body>
</html>`;
  }

  function generatePrompt(): string {
    const lines: string[] = [];
    lines.push(`Build me a modern, stunning event website with the following details:\n`);
    if (form.eventName) lines.push(`Event Name: ${form.eventName}`);
    if (form.tagline) lines.push(`Tagline: ${form.tagline}`);
    if (form.startDate || form.endDate) {
      const dateStr = [form.startDate, form.endDate].filter(Boolean).join(" to ");
      lines.push(`Date: ${dateStr}`);
    }
    if (form.startTime || form.endTime) {
      const timeStr = [form.startTime, form.endTime].filter(Boolean).join(" – ");
      lines.push(`Time: ${timeStr}`);
    }
    if (form.venue) lines.push(`Venue/Location: ${form.venue}`);
    if (form.description) lines.push(`Description: ${form.description}`);
    if (form.themeColor) lines.push(`Theme/Brand Color: ${form.themeColor}`);

    const styleName = form.designStyle === "custom"
      ? form.customStyle
      : DESIGN_STYLES.find(s => s.id === form.designStyle);
    if (form.designStyle === "custom" && form.customStyle) {
      lines.push(`Design Style: ${form.customStyle}`);
    } else if (styleName && typeof styleName === "object") {
      lines.push(`Design Style: ${styleName.label} — ${styleName.desc}`);
    }

    if (form.additionalDetails) lines.push(`\nAdditional Details:\n${form.additionalDetails}`);

    lines.push(`\n---`);
    lines.push(`\nIMPORTANT INSTRUCTIONS:`);
    lines.push(`1. I need the FULL COMPLETE code in a SINGLE HTML file with CSS and JS combined inline (all in one file). Do NOT split into separate files. Give me the entire code from <!doctype html> to </html> — nothing left out, no placeholders, no "add your code here" comments. Every section must be fully coded.`);
    lines.push(`2. Include a prominent "Register Now" button/CTA that links to the registration form.`);
    lines.push(`   Registration Form Link: ${registrationLink}`);
    lines.push(`3. Under the registration or in a dedicated "Participant Portal" section, provide quick-access links to the Participant Workspace and its facilities:`);
    lines.push(`   - Workspace Dashboard: ${workspaceLink}`);
    lines.push(`   - Schedule & Deadlines: ${scheduleLink}`);
    lines.push(`   - Announcements: ${announcementsLink}`);
    lines.push(`   - Team Setup: ${teamLink}`);
    lines.push(`   - Project Submission: ${submissionsLink}`);
    lines.push(`\nThe website must be a single self-contained HTML file with <style> and <script> tags embedded inside. Make it visually impressive with:`);
    lines.push(`- Smooth scroll animations`);
    lines.push(`- Responsive design (mobile-friendly)`);
    lines.push(`- Hero section, about section, schedule/details section, a footer`);
    lines.push(`- The "Register Now" button should use this exact link: ${registrationLink}`);
    lines.push(`\nNOTE FOR THE AI (not for the user):`);
    lines.push(`- Every button you create must be working.`);
    lines.push(`- Animate the UI also (e.g., add hover effects, scroll-triggered fade-ins, smooth transitions, and subtle micro-animations to make the interface feel responsive and alive).`);
    lines.push(`- If you do not know what content to add to a button or section, show "Coming Soon" and notify the user: "There is no content in [name of section] section. What would you like to add? Please tell me and I will add it."`);
    lines.push(`\nRemember: Give me the FULL CODE in ONE single HTML file (HTML + CSS + JS combined). I will paste this directly into my website builder code editor.`);

    return lines.join("\n");
  }

  async function handleCopy() {
    const prompt = generatePrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt & registration link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="flex-1 sm:flex-none gap-2 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" /> Generate AI Prompt (Gemini / Claude)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              AI Prompt Generator
            </DialogTitle>
            <DialogDescription>
              Fill in your event details below. We'll generate a highly detailed prompt that you can <b>copy and paste into Gemini or Claude</b> to automatically write the full HTML/Tailwind code for your event website.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wp-name">Event Name *</Label>
                <Input
                  id="wp-name"
                  placeholder="e.g. HackFest 2026"
                  value={form.eventName}
                  onChange={(e) => update("eventName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-tagline">Tagline</Label>
                <Input
                  id="wp-tagline"
                  placeholder="e.g. Code. Create. Conquer."
                  value={form.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wp-start-date">Start Date</Label>
                <Input
                  id="wp-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-end-date">End Date</Label>
                <Input
                  id="wp-end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wp-start-time">Start Time</Label>
                <Input
                  id="wp-start-time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update("startTime", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-end-time">End Time</Label>
                <Input
                  id="wp-end-time"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update("endTime", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-venue">Venue / Location</Label>
              <Input
                id="wp-venue"
                placeholder="e.g. Convention Center, New Delhi"
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-desc">Event Description</Label>
              <Textarea
                id="wp-desc"
                placeholder="Briefly describe what this event is about…"
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-color">Theme Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="wp-color"
                  type="color"
                  value={form.themeColor}
                  onChange={(e) => update("themeColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5"
                />
                <span className="text-sm text-muted-foreground font-mono">{form.themeColor}</span>
              </div>
            </div>

            {/* Design Style Selector */}
            <div className="space-y-3">
              <Label>Design Style</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DESIGN_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => update("designStyle", form.designStyle === style.id ? "" : style.id)}
                    className={`group relative flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${form.designStyle === style.id
                        ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/40 shadow-sm"
                        : "border-border/60 bg-card hover:border-purple-500/40 hover:bg-purple-500/5"
                      }`}
                  >
                    <span className="text-xl">{style.emoji}</span>
                    <span className="text-xs font-semibold leading-tight">{style.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{style.desc}</span>
                  </button>
                ))}
              </div>
              {/* Custom style option */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update("designStyle", form.designStyle === "custom" ? "" : "custom")}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${form.designStyle === "custom"
                      ? "border-purple-500 bg-purple-500/10 text-purple-300"
                      : "border-border/60 bg-card text-muted-foreground hover:border-purple-500/40"
                    }`}
                >
                  ✏️ Custom
                </button>
                {form.designStyle === "custom" && (
                  <Input
                    id="wp-custom-style"
                    placeholder="e.g. Anime-inspired, dark with cherry blossom accents…"
                    value={form.customStyle}
                    onChange={(e) => update("customStyle", e.target.value)}
                    className="flex-1"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wp-extra">Additional Details / Instructions</Label>
              <Textarea
                id="wp-extra"
                placeholder="Any extra sections, sponsors, speakers, special requirements…"
                rows={3}
                value={form.additionalDetails}
                onChange={(e) => update("additionalDetails", e.target.value)}
              />
            </div>

            {/* Registration link preview */}
            <div className="rounded-lg border border-border/60 bg-surface/50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <ExternalLink className="h-3.5 w-3.5" />
                Registration Form Link (auto-included)
              </div>
              <code className="block text-xs text-purple-400 break-all bg-background/60 rounded-md px-3 py-2 border border-border/40">
                {registrationLink}
              </code>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCopy}
              disabled={!form.eventName.trim()}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              <ClipboardCopy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
