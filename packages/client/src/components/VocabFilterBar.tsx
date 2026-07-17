import type { VocabFilters } from "@/lib/vocab-filter";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A fixed-width select over "all" + the given options, used for the level/category refinements. */
export function FilterSelect({
  value,
  onChange,
  placeholder,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allLabel: string;
  options: string[];
}) {
  return (
    <Select
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger
        className="w-40"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map(o => (
          <SelectItem
            key={o}
            value={o}
          >{o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The Vocabulary page's filter row: scope, level, category, and Renshuu-status selects. */
export function VocabFilterBar({
  filters,
  onPatch,
  levels,
  categories,
}: {
  filters: VocabFilters;
  onPatch: (patch: Partial<VocabFilters>) => void;
  levels: string[];
  categories: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.scope}
        onValueChange={scope => onPatch({
          scope,
        })}
      >
        <SelectTrigger
          className="w-40"
          aria-label="Vocab scope"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All vocab</SelectItem>
          <SelectItem value="yours">Yours</SelectItem>
          <SelectItem value="lessons">From AI Lessons</SelectItem>
        </SelectContent>
      </Select>
      <FilterSelect
        value={filters.level}
        onChange={level => onPatch({
          level,
        })}
        placeholder="Level"
        allLabel="All levels"
        options={levels}
      />
      <FilterSelect
        value={filters.category}
        onChange={category => onPatch({
          category,
        })}
        placeholder="Category"
        allLabel="All categories"
        options={categories}
      />
      <Select
        value={filters.renshuu}
        onValueChange={renshuu => onPatch({
          renshuu,
        })}
      >
        <SelectTrigger
          className="w-40"
          aria-label="Renshuu status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Renshuu</SelectItem>
          <SelectItem value="in">In Renshuu</SelectItem>
          <SelectItem value="not">Not in Renshuu</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
