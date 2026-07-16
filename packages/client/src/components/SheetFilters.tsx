import type { FilterOption } from "@/lib/answer-sheets";

import { LEARNING_AREAS } from "@sentence-bank/types";

import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_FILTER } from "@/lib/answer-sheets";

/**
 * The shared filter bar for the Question Sheets / Answer Sheets / Book Exercises lists: a searchable
 * "resource" (Textbook/Worksheet) dropdown and a fixed "Learning Area" dropdown. Both use the
 * `ALL_FILTER` sentinel for "no filter". The resource control hides itself when there is at most one
 * resource to choose from (matching the sentence-list convention).
 */
export function SheetFilters({
  resource,
  onResourceChange,
  resourceOptions,
  area,
  onAreaChange,
}: {
  resource: string;
  onResourceChange: (value: string) => void;
  resourceOptions: FilterOption[];
  area: string;
  onAreaChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {resourceOptions.length > 1
        ? (
          <Combobox
            value={resource}
            onChange={onResourceChange}
            options={resourceOptions}
            ariaLabel="Filter by resource"
            searchPlaceholder="Search resources…"
            className="w-52"
          />
        )
        : null}
      <Select
        value={area}
        onValueChange={onAreaChange}
      >
        <SelectTrigger
          className="w-40"
          aria-label="Filter by learning area"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER}>All areas</SelectItem>
          {LEARNING_AREAS.map(a => (
            <SelectItem
              key={a}
              value={a}
            >
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
