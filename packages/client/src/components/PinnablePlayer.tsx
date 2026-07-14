import { useState } from "react";

import { Pin, PinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Wraps the session's video/stopwatch player and lets the learner "pin" it: when pinned the player
 * docks as a compact bar just below the app header (sticky) so it stays visible while scrolling the
 * notes. Pinning only swaps classNames on a stable wrapper — the player element is never remounted, so
 * the YouTube iframe keeps playing without reloading. `canPin` gates the feature off for the stopwatch
 * fallback (no video to keep in view).
 */
export function PinnablePlayer({
  canPin = true,
  children,
}: {
  canPin?: boolean;
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const isPinned = canPin && pinned;

  return (
    // Outer = the "bar": spans the column and gets an opaque bg when pinned so notes scroll cleanly
    // under it. top-12 clears the sticky h-12 header; z-20 sits under the header (z-30), above notes.
    <div
      className={cn(isPinned && `
        sticky top-12 z-20 bg-background py-2 shadow-sm
      `)}
    >
      {/* Inner = the video box + button anchor; constrained to a compact size when pinned. */}
      <div
        className={cn("relative", isPinned && "mx-auto w-64 max-w-full")}
      >
        {children}
        {canPin && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => setPinned(p => !p)}
            aria-label={isPinned ? "Unpin video" : "Pin video"}
            className="
              absolute top-2 right-2 z-10 size-7 opacity-80
              hover:opacity-100
            "
          >
            {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
