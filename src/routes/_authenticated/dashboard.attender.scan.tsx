import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { processCheckInCode, updateAttendanceStatus } from "@/lib/attendance.functions";
import { Camera, CheckCircle2, XCircle, AlertTriangle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/attender/scan")({
  head: () => ({ meta: [{ title: "Take Attendance — EVENT-HUB" }] }),
  component: ScanPage,
});

type ScanResult = Awaited<ReturnType<typeof processCheckInCode>>;

function ScanPage() {
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScanResult | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const qc = useQueryClient();

  const { data: checkedInByAttender } = useQuery({
    queryKey: ["attender", scannedResult?.registration.checked_in_by],
    enabled: !!scannedResult?.registration.checked_in_by,
    queryFn: async () => {
      const { data } = await supabase
        .from("attenders")
        .select("name")
        .eq("id", scannedResult!.registration.checked_in_by)
        .maybeSingle();
      return data;
    }
  });

  async function handleCode(code: string, isFromScanner: boolean = false) {
    if (loading) return;
    setLoading(true);
    setShowScanner(false);
    try {
      let finalCode = code;
      
      if (isFromScanner) {
        if (code.startsWith("eventhub://checkin/")) {
          finalCode = code.replace("eventhub://checkin/", "");
        } else {
          throw new Error("Invalid QR Code: Must use the internal Event-Hub QR Pass.");
        }
      }

      const res = await processCheckInCode(finalCode);
      if (res.registration.checked_in_at) {
        toast.warning("Attendance already taken!");
      }
      setScannedResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
      setScannedResult(null);
      setShowScanner(true);
    } finally {
      setLoading(false);
    }
  }

  async function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCode(manualCode.trim(), false); // false = manual entry
  }

  async function markAttendance(status: "present" | "absent") {
    if (!scannedResult) return;
    setActionLoading(true);
    try {
      await updateAttendanceStatus(scannedResult.registration.id, status);
      toast.success(`Marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["attendance-history"] });
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update attendance");
    } finally {
      setActionLoading(false);
    }
  }

  function reset() {
    setScannedResult(null);
    setManualCode("");
    setShowScanner(true);
  }

  return (
    <>
      <PageHeader title="Take Attendance" subtitle="Scan QR code or enter code manually." />
      <div className="mx-auto max-w-2xl p-6">
        {!scannedResult && (
          <Card className="p-6">
            <form onSubmit={onManualSubmit} className="flex gap-2 mb-6">
              <Input
                placeholder="Enter 8-character code..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                maxLength={8}
                className="font-mono"
              />
              <Button type="submit" disabled={loading}>
                Lookup
              </Button>
            </form>

            <div className="rounded-xl border border-border/60 overflow-hidden bg-black/5 aspect-square max-w-sm mx-auto flex flex-col relative">
              {showScanner ? (
                <Scanner
                  formats={['qr_code', 'code_128']}
                  allowMultiple={true}
                  scanDelay={2000}
                  onScan={(detected) => {
                    if (detected && detected.length > 0) {
                      const val = detected[0].rawValue?.trim();
                      if (val) {
                        handleCode(val, true);
                      }
                    }
                  }}
                  onError={(e) => toast.error("Scanner error: " + e.message)}
                  styles={{ container: { width: '100%', height: '100%' } }}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <Camera className="h-8 w-8 mb-2 opacity-50" />
                  <p>Processing...</p>
                </div>
              )}
            </div>
            {showScanner && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Point camera at participant's QR code
              </p>
            )}
          </Card>
        )}

        {scannedResult && (
          <Card className="p-8 border-2 shadow-lg">
            <div className="text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand/10">
                <User className="h-8 w-8 text-brand" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {scannedResult.profile?.first_name} {scannedResult.profile?.last_name}
                </h2>
                <p className="text-muted-foreground">{scannedResult.profile?.email}</p>
                <div className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Code: {manualCode || "SCANNED"}
                </div>
              </div>

              {scannedResult.registration.checked_in_at ? (
                <div className="mt-6 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
                  <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
                  <h3 className="text-xl font-bold">REJECTED</h3>
                  <p className="font-medium mt-1">Already Checked In</p>
                  <p className="text-sm mt-2 opacity-80">
                    Checked in by: {checkedInByAttender?.name || "Unknown"}
                  </p>
                  <p className="text-xs mt-1 opacity-80">
                    At: {new Date(scannedResult.registration.checked_in_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-24 flex-col gap-2 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => markAttendance("absent")}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-8 w-8" />
                    Mark Absent
                  </Button>
                  <Button
                    size="lg"
                    className="h-24 flex-col gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => markAttendance("present")}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="h-8 w-8" />
                    Mark Present
                  </Button>
                </div>
              )}

              <div className="pt-6 border-t border-border/60 mt-8">
                <Button variant="ghost" onClick={reset} disabled={actionLoading}>
                  Scan Another Code
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
