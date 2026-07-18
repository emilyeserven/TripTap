import type { ReactNode } from "react";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Hides its children behind a CSS blur until the user hovers or clicks them — used to keep a Japanese
 * sentence's English translation from spoiling recall until it's wanted. Hovering reveals temporarily;
 * clicking (or Enter/Space) reveals for good. Purely visual: the text is still in the DOM.
 */
export function BlurReveal({
  children,
  className,
  label = "Reveal translation",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={revealed ? undefined : label}
      title={revealed ? undefined : label}
      onClick={() => setRevealed(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setRevealed(true);
        }
      }}
      className={cn(
        `
          cursor-pointer rounded-sm transition-[filter] duration-150
          outline-none
        `,
        "focus-visible:ring-2 focus-visible:ring-ring",
        revealed
          ? "blur-none"
          : `
            blur-[3px] select-none
            hover:blur-none
          `,
        className,
      )}
    >
      {children}
    </span>
  );
}
