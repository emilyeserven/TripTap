import type { ComboboxOption } from "@/components/ui/combobox";

import * as React from "react";

import { Check, ListFilter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { comboboxMatches } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** One filter dimension in the combined popover. The first option is treated as the "all"/reset value. */
export interface FilterSection {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
}

/** The reset value for a section (its first option, e.g. "all"). */
function resetValue(section: FilterSection): string {
  return section.options[0]?.value ?? "all";
}

/**
 * A single "Filters" control that combines several single-select dimensions (AI Lesson, Source,
 * Grammar, Deck…) into one popover with labeled sections and a shared search box. Sections with only
 * the reset option are hidden. Replaces a row of separate comboboxes.
 */
export function SentenceFilters({
  sections,
}: { sections: FilterSection[] }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const shown = sections.filter(s => s.options.length > 1);
  const activeCount = shown.filter(s => s.value !== resetValue(s)).length;

  const clearAll = () => {
    for (const section of shown) section.onChange(resetValue(section));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label="Filters"
          className="gap-2"
        >
          <ListFilter className="size-4" />
          Filters
          {activeCount > 0
            ? <Badge variant="secondary">{activeCount}</Badge>
            : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
      >
        <div className="p-2">
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search filters…"
            aria-label="Search filters"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {shown.map((section) => {
            const filtered = query.trim()
              ? section.options.filter(o => comboboxMatches(query, o.label))
              : section.options;
            if (filtered.length === 0) return null;
            return (
              <div
                key={section.key}
                className="mb-1"
              >
                <p
                  className="
                    px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground
                  "
                >
                  {section.label}
                </p>
                {filtered.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => section.onChange(o.value)}
                    className={cn(
                      `
                        flex w-full items-start gap-2 rounded-sm px-2 py-1.5
                        text-left text-sm
                        hover:bg-accent
                      `,
                      o.value === section.value && "font-medium",
                    )}
                  >
                    <Check
                      className={cn("mt-0.5 size-4 shrink-0", o.value === section.value
                        ? "opacity-100"
                        : "opacity-0")}
                    />
                    <span className="min-w-0 wrap-break-word">{o.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {activeCount > 0
          ? (
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={clearAll}
              >
                Clear all
              </Button>
            </div>
          )
          : null}
      </PopoverContent>
    </Popover>
  );
}
