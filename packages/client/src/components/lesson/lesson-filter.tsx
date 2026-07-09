import type { LessonRef } from "./LessonBadge";

import { Button } from "@/components/ui/button";

/** `All` + one chip per lesson. `value` is a lesson slug or "all". */
export function LessonFilterChips({
  lessons,
  value,
  onChange,
  extra,
}: {
  lessons: LessonRef[];
  value: string;
  onChange: (value: string) => void;
  /** Optional extra chips (e.g. a "Mine" bucket), rendered after "All". */
  extra?: { value: string;
    label: string; }[];
}) {
  if (lessons.length + (extra?.length ?? 0) < 2) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={value === "all" ? "default" : "outline"}
        onClick={() => onChange("all")}
      >
        All
      </Button>
      {(extra ?? []).map(e => (
        <Button
          key={e.value}
          size="sm"
          variant={value === e.value ? "default" : "outline"}
          onClick={() => onChange(e.value)}
        >
          {e.label}
        </Button>
      ))}
      {lessons.map(l => (
        <Button
          key={l.slug}
          size="sm"
          variant={value === l.slug ? "default" : "outline"}
          onClick={() => onChange(l.slug)}
        >
          {l.title}
        </Button>
      ))}
    </div>
  );
}
