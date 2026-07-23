import * as React from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional group heading. A header renders above the first option of each new section. */
  section?: string;
  /** De-emphasize this option (dimmed) while keeping it selectable. */
  muted?: boolean;
}

/** A non-selectable group heading shown above the first option of a section. */
export function SectionHeader({
  title,
}: { title: string }) {
  return (
    <div
      className="
        px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground
        uppercase
      "
    >
      {title}
    </div>
  );
}

/** Case-insensitive substring match used to filter options by the typed query. */
export function comboboxMatches(query: string, label: string): boolean {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * A searchable single-select built from Popover + Input (the project has no `cmdk`). The trigger
 * shows the selected option's label; the popover offers a type-to-filter box over the options.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = options.find(o => o.value === value);
  const filtered = query.trim() ? options.filter(o => comboboxMatches(query, o.label)) : options;

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
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            `
              h-auto min-h-9 justify-between gap-2 py-2 text-left font-normal
              whitespace-normal
            `,
            className,
          )}
        >
          <span
            className={cn("min-w-0 wrap-break-word", !selected && `
              text-muted-foreground
            `)}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0"
      >
        <div className="p-2">
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0
            ? <p className="px-2 py-1.5 text-sm text-muted-foreground">No matches.</p>
            : filtered.map((o, i) => (
              <React.Fragment key={o.value}>
                {o.section && o.section !== filtered[i - 1]?.section
                  ? <SectionHeader title={o.section} />
                  : null}
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    `
                      flex w-full items-start gap-2 rounded-sm px-2 py-1.5
                      text-left text-sm
                      hover:bg-accent
                    `,
                    o.value === value && "font-medium",
                    o.muted && o.value !== value && `
                      text-muted-foreground opacity-60
                    `,
                  )}
                >
                  <Check
                    className={cn("mt-0.5 size-4 shrink-0", o.value === value
                      ? "opacity-100"
                      : "opacity-0")}
                  />
                  <span className="min-w-0 wrap-break-word">{o.label}</span>
                </button>
              </React.Fragment>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
