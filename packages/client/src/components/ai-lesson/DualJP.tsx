import { useState } from "react";

import { useReadingLevel } from "./reading-level-context";

/**
 * A dual-level Japanese passage. Shows the version matching the global reading-level toggle (falling
 * back to whichever of easy/full is present), with a one-tap inline peek at the other version. Renders
 * nothing when neither is supplied.
 */
export function DualJP({
  easy,
  full,
  className,
}: {
  easy?: string | null;
  full?: string | null;
  className?: string;
}) {
  const level = useReadingLevel();
  const [peek, setPeek] = useState(false);

  const primary = level === "easy" ? (easy ?? full) : (full ?? easy);
  const secondary = level === "easy" ? full : easy;
  if (!primary) return null;

  const hasOther = Boolean(secondary && secondary !== primary);
  const otherLabel = level === "easy" ? "くわしい" : "やさしい";

  return (
    <div
      className={`
        space-y-1.5 rounded-md border bg-muted/30 p-3
        ${className ?? ""}
      `}
    >
      <p className="text-sm/relaxed">{peek && secondary ? secondary : primary}</p>
      {hasOther && (
        <button
          type="button"
          onClick={() => setPeek(p => !p)}
          className="
            text-xs text-muted-foreground
            hover:text-foreground hover:underline
          "
        >
          {peek ? "もどす" : otherLabel}
        </button>
      )}
    </div>
  );
}
