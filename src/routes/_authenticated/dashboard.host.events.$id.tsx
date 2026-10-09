import { createFileRoute, Outlet, Link, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const Route = createFileRoute("/_authenticated/dashboard/host/events/$id")({
  component: EventLayout,
});

function EventLayout() {
  const { id } = Route.useParams();
  const [dismissed, setDismissed] = useState(false);
  const matchRoute = useMatchRoute();
  
  // Don't show the floating prompt on the overview page itself since it already has a big checklist
  const isOverview = matchRoute({ to: "/dashboard/host/events/$id", fuzzy: false });

  const { data: event } = useQuery({
    queryKey: ["event-onboarding-status", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("is_published, website_blocks, schedule_timeline, registration_fields")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (isOverview && event) {
      const tourKey = `host-sidebar-tour-seen-${id}`;
      if (!localStorage.getItem(tourKey)) {
        setTimeout(() => {
          const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: [
              { element: '#sidebar-link-overview', popover: { title: 'Event Overview', description: 'Your main dashboard for this event. View quick stats, publish status, and overall progress here.', side: "right", align: 'start' } },
              { element: '#sidebar-link-website', popover: { title: 'Website Builder', description: 'Design your public event landing page using our AI generator or custom code.', side: "right", align: 'start' } },
              { element: '#sidebar-link-form', popover: { title: 'Registration Form', description: 'Customize the questions attendees must answer when they register.', side: "right", align: 'start' } },
              { element: '#sidebar-link-registrations', popover: { title: 'Registrations', description: 'Manage approved and pending participants, send emails, and export data.', side: "right", align: 'start' } },
              { element: '#sidebar-link-judges', popover: { title: 'Judges & Criteria', description: 'Invite judges and define the scoring criteria for the submissions.', side: "right", align: 'start' } },
              { element: '#sidebar-link-attenders', popover: { title: 'Attendance Takers', description: 'Invite staff members to scan QR codes and mark attendees at the door.', side: "right", align: 'start' } },
              { element: '#sidebar-link-submissions', popover: { title: 'Submissions', description: 'View and manage all projects submitted by participants.', side: "right", align: 'start' } },
              { element: '#sidebar-link-announcements', popover: { title: 'Announcements', description: 'Broadcast live notifications to all participants via their portal or email.', side: "right", align: 'start' } },
              { element: '#sidebar-link-schedule', popover: { title: 'Schedule', description: 'Build your event timeline so participants know exactly what is happening and when.', side: "right", align: 'start' } },
              { element: '#sidebar-link-analytics', popover: { title: 'Analytics', description: 'View deep insights, charts, and metrics about your event performance.', side: "right", align: 'start' } },
            ],
            onDestroyStarted: () => {
              localStorage.setItem(tourKey, 'true');
              driverObj.destroy();
            }
          });
          driverObj.drive();
        }, 500);
      }
    }
  }, [isOverview, event, id]);

  if (!event) return <Outlet />;

  const hasForm = Object.keys(event.registration_fields || {}).length > 0;
  const hasWebsite = Array.isArray(event.website_blocks) && event.website_blocks.length > 0;
  const hasSchedule = Array.isArray(event.schedule_timeline) && event.schedule_timeline.length > 0;
  
  const isCompleted = hasForm && hasWebsite && hasSchedule;
  const showFloating = !event.is_published && !isCompleted && !dismissed && !isOverview;

  return (
    <>
      <Outlet />
      
      {showFloating && (
        <div className="fixed bottom-6 right-6 w-80 bg-card border border-amber-500/50 shadow-2xl rounded-xl p-5 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <button 
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground bg-surface/50 rounded-full p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
            <div className="w-full">
              <h4 className="font-semibold text-sm text-foreground">Setup Incomplete</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                Your event is in preview mode. Complete these 3 steps to go live:
              </p>
              
              <ul className="text-xs space-y-3 mb-5 w-full">
                <li className="flex items-center justify-between">
                  <span className={hasWebsite ? "text-emerald-500 line-through" : "text-amber-500 font-medium"}>
                    {hasWebsite ? "✓" : "1."} Customize Website
                  </span>
                  {!hasWebsite && (
                    <Link to={`/dashboard/host/events/${id}/website`} className="text-[10px] bg-brand text-brand-foreground px-2 py-0.5 rounded hover:bg-brand/80">
                      Go
                    </Link>
                  )}
                </li>
                <li className="flex items-center justify-between">
                  <span className={hasSchedule ? "text-emerald-500 line-through" : "text-amber-500 font-medium"}>
                    {hasSchedule ? "✓" : "2."} Create Schedule
                  </span>
                  {!hasSchedule && (
                    <Link to={`/dashboard/host/events/${id}/schedule`} className="text-[10px] bg-brand text-brand-foreground px-2 py-0.5 rounded hover:bg-brand/80">
                      Go
                    </Link>
                  )}
                </li>
                <li className="flex items-center justify-between">
                  <span className={hasForm ? "text-emerald-500 line-through" : "text-amber-500 font-medium"}>
                    {hasForm ? "✓" : "3."} Edit Registration Form
                  </span>
                  {!hasForm && (
                    <Link to={`/dashboard/host/events/${id}/form`} className="text-[10px] bg-brand text-brand-foreground px-2 py-0.5 rounded hover:bg-brand/80">
                      Go
                    </Link>
                  )}
                </li>
              </ul>
              
              <Link to={`/dashboard/host/events/${id}`} className="block">
                <Button size="sm" variant="outline" className="w-full h-8 text-xs bg-surface/30">
                  Return to Overview
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
