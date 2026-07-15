import type { ReactNode } from "react";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * A titled section whose body collapses when the header is clicked — used to let a long editor (e.g. a
 * lesson) be scanned and navigated quickly. The chevron rotates to signal state; an optional `action`
 * (an add button, a toggle) sits at the right of the header, outside the trigger, so it stays usable
 * without toggling the section. Uncontrolled: starts open unless `defaultOpen={false}`.
 */
export function CollapsibleSection({
  title,
  description,
  action,
  defaultOpen = true,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <CollapsibleTrigger
          className="group flex min-w-0 flex-1 items-start gap-2 text-left"
          aria-label={open ? "Collapse section" : "Expand section"}
        >
          <ChevronDown
            className={cn(
              `
                mt-0.5 size-4 shrink-0 text-muted-foreground
                transition-transform
              `,
              !open && "-rotate-90",
            )}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{title}</span>
            {description
              ? (
                <span
                  className="block text-xs font-normal text-muted-foreground"
                >
                  {description}
                </span>
              )
              : null}
          </span>
        </CollapsibleTrigger>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <CollapsibleContent className="space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
