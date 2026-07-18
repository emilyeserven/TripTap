import type { ComboboxOption } from "@/components/ui/combobox";

import * as React from "react";

import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { comboboxMatches, SectionHeader } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A searchable multi-select built from Popover + Input + Badge (the single-select {@link Combobox}
 * can't be reused directly). Selected options render as removable badges above the trigger; the
 * popover offers a type-to-filter list that toggles items without closing. `single` caps selection to
 * one (for single-value taxonomies). When `creatable`, a query with no exact match offers a
 * "Create …" row that calls `onCreate`.
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
  creatable = false,
  onCreate,
  creating = false,
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
  creatable?: boolean;
  onCreate?: (name: string) => void;
  creating?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedSet = new Set(value);
  const selectedOptions = value
    .map(v => options.find(o => o.value === v))
    .filter((o): o is ComboboxOption => o !== undefined);
  const trimmedQuery = query.trim();
  const filtered = trimmedQuery ? options.filter(o => comboboxMatches(query, o.label)) : options;
  const hasExactMatch = options.some(o => o.label.toLowerCase() === trimmedQuery.toLowerCase());
  const showCreate = creatable && !!onCreate && trimmedQuery.length > 0 && !hasExactMatch;

  function create() {
    if (!onCreate || !trimmedQuery || creating) return;
    onCreate(trimmedQuery);
    setQuery("");
  }

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
            {filtered.length === 0 && !showCreate
              ? <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</p>
              : filtered.map((o, i) => {
                const on = selectedSet.has(o.value);
                return (
                  <React.Fragment key={o.value}>
                    {o.section && o.section !== filtered[i - 1]?.section
                      ? <SectionHeader title={o.section} />
                      : null}
                    <button
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
                  </React.Fragment>
                );
              })}
            {showCreate && (
              <button
                type="button"
                onClick={create}
                disabled={creating}
                className="
                  flex w-full items-center gap-2 rounded-sm px-2 py-1.5
                  text-left text-sm
                  hover:bg-accent
                  disabled:opacity-60
                "
              >
                {creating
                  ? <Loader2 className="size-4 shrink-0 animate-spin" />
                  : <Plus className="size-4 shrink-0" />}
                <span className="truncate">
                  {creating ? "Creating…" : `Create “${trimmedQuery}”`}
                </span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
