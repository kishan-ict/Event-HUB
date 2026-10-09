import { cn } from "@/lib/utils";

export function LoadingScreen({ message = "LOADING", className }: { message?: string, className?: string }) {
  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md", className)}>
      <div className="relative flex flex-col items-center gap-6">
        {/* Retro glowing backdrop */}
        <div className="absolute inset-0 -z-10 rounded-full bg-brand/20 blur-3xl animate-pulse" />
        
        {/* Geometric spinner */}
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-[spin_1.5s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-r-brand/80 animate-[spin_2s_linear_infinite_reverse]" />
          <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-brand/60 animate-[spin_3s_linear_infinite]" />
          <div className="absolute inset-6 rounded-full border-2 border-brand/20" />
        </div>

        {/* Loading Text */}
        <div className="text-brand font-mono text-sm tracking-[0.3em] uppercase animate-pulse flex items-center gap-1">
          {message}
          <span className="flex gap-0.5">
            <span className="animate-[bounce_1s_infinite_0ms]">.</span>
            <span className="animate-[bounce_1s_infinite_200ms]">.</span>
            <span className="animate-[bounce_1s_infinite_400ms]">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-flex h-5 w-5", className)}>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-[spin_1.5s_linear_infinite]" />
      <div className="absolute inset-0.5 rounded-full border-2 border-transparent border-r-brand/60 animate-[spin_2s_linear_infinite_reverse]" />
    </div>
  );
}
