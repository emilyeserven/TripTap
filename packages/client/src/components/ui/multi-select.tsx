import type { ComboboxOption } from "@/components/ui/combobox";

import * as React from "react";

import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { comboboxMatches } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A searchable multi-select built from Popover + Input + Badge (the single-select {@link Combobox}
 * can't be reused directly). Selected options render as removable badges above the trigger; the
 * popover offers a type-to-filter list that toggles items without closing. `single` caps selection to
 * one (for single-value taxonomies).
 */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No options.",
  ariaLabel,
  single = false,
  disabled = false,
  className,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  single?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedSet = new Set(value);
  const selectedOptions = value
    .map(v => options.find(o => o.value === v))
    .filter((o): o is ComboboxOption => o !== undefined);
  const filtered = query.trim() ? options.filter(o => comboboxMatches(query, o.label)) : options;

  function toggle(optionValue: string) {
    if (single) {
      onChange(selectedSet.has(optionValue) ? [] : [optionValue]);
      setOpen(false);
      return;
    }
    onChange(
      selectedSet.has(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...value, optionValue],
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map(o => (
            <Badge
              key={o.value}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {o.label}
              <button
                type="button"
                aria-label={`Remove ${o.label}`}
                className="
                  rounded-full
                  hover:bg-black/10
                "
                onClick={() => toggle(o.value)}
                disabled={disabled}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
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
            disabled={disabled}
            className="w-full justify-between gap-2 font-normal"
          >
            <span className="truncate text-muted-foreground">
              {placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
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
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0
              ? <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</p>
              : filtered.map((o) => {
                const on = selectedSet.has(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn(
                      `
                        flex w-full items-center gap-2 rounded-sm px-2 py-1.5
                        text-left text-sm
                        hover:bg-accent
                      `,
                      on && "font-medium",
                    )}
                  >
                    <Check
                      className={cn("size-4 shrink-0", on
                        ? "opacity-100"
                        : "opacity-0")}
                    />
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
