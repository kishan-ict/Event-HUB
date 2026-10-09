import { useState, useEffect } from "react";

export function OfflineHandler() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur">
      <div className="text-center px-6">
        <div className="text-4xl mb-4">📡</div>
        <h2 className="text-lg font-semibold">You're offline</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}
