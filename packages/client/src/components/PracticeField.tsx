import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/** A labelled field wrapper with an optional hint, shared by the practice editor tabs. */
export function PracticeField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <Label className="text-sm">{label}</Label>
        {hint ? <span className="text-xs text-muted-foreground/80">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
