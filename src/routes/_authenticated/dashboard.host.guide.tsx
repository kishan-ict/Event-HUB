import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, LayoutTemplate, Calendar, Users, Megaphone, Target, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/host/guide")({
  head: () => ({ meta: [{ title: "Host Guide — EVENT-HUB" }] }),
  component: HostGuide,
});

function HostGuide() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur sticky top-0 z-10">
        <Link
          to="/dashboard/host"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-12">
        <div className="text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand mb-6">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">The Event Host Guide</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know to create, manage, and launch a successful event using EVENT-HUB. Follow these steps to get started in minutes.
          </p>
        </div>

        <div className="space-y-8">
          <GuideStep 
            number="1"
            title="Create Your Event"
            icon={Target}
            description="The first step is bringing your event into existence. When you create an event, you'll need to provide a name, a URL slug (e.g., /my-awesome-event), and the start/end dates. Once created, you'll be dropped into the Event Overview dashboard."
          />
          
          <GuideStep 
            number="2"
            title="Customize Your Registration Form"
            icon={Users}
            description="Every event needs participants! By default, we collect basic info like Name and Email. In the Registration Form builder, you can add custom questions like 'Dietary Requirements', 'T-Shirt Size', or 'GitHub Link'. You can make these questions required or optional."
          />

          <GuideStep 
            number="3"
            title="Build Your Event Website (AI Powered)"
            icon={LayoutTemplate}
            description="You don't need to be a designer. Head to the Website Builder and use our AI Prompt Generator. Choose a style (like 'Retro', 'Cyberpunk', or 'Glassmorphism'), toggle advanced interactive effects, and copy the generated prompt into an LLM (like Gemini or Claude) to instantly build a stunning HTML landing page. Upload your custom Banner and Logo, and we will automatically compress them and set up your social media sharing tags (Open Graph) so it looks great on WhatsApp and Twitter."
          />

          <GuideStep 
            number="4"
            title="Set the Schedule & Deadlines"
            icon={Calendar}
            description="Clear communication is key. Use the Schedule builder to outline your event timeline. Add milestones like 'Opening Ceremony', 'Hacking Begins', and 'Project Submission Deadline'. Participants will see this timeline in their portal."
          />

          <GuideStep 
            number="5"
            title="Publish & Launch!"
            icon={Megaphone}
            description="Once your Website, Form, and Schedule are ready, head to the Event Overview page and toggle your event to 'Live'. This makes your website public and opens up registration to the world. Share your unique link and watch the attendees roll in!"
          />
        </div>

        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-8 text-center mt-12">
          <CheckCircle2 className="h-10 w-10 text-brand mx-auto mb-4" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">Ready to host?</h2>
          <p className="text-muted-foreground mb-6">You've got the knowledge. Now it's time to execute.</p>
          <Link to="/events/create">
            <Button size="lg" className="px-8 font-semibold shadow-xl shadow-brand/20 hover:scale-105 transition-transform">
              Create Your First Event
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

function GuideStep({ number, title, description, icon: Icon }: any) {
  return (
    <Card className="p-6 md:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:border-brand/50 transition-colors">
      <div className="absolute top-0 right-0 p-8 text-9xl font-black text-muted/10 select-none group-hover:text-brand/5 transition-colors pointer-events-none -mt-8 -mr-4">
        {number}
      </div>
      
      <div className="shrink-0">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-elevated text-foreground group-hover:bg-brand group-hover:text-white transition-colors shadow-sm">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      <div className="space-y-2 relative z-10">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  );
}
