import type { AiLessonRef } from "./AiLessonBadge";

import { Button } from "@/components/ui/button";

/** `All` + one chip per AI Lesson. `value` is an AI Lesson slug or "all". */
export function AiLessonFilterChips({
  aiLessons,
  value,
  onChange,
  extra,
}: {
  aiLessons: AiLessonRef[];
  value: string;
  onChange: (value: string) => void;
  /** Optional extra chips (e.g. a "Mine" bucket), rendered after "All". */
  extra?: { value: string;
    label: string; }[];
}) {
  if (aiLessons.length + (extra?.length ?? 0) < 2) return null;
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
      {aiLessons.map(l => (
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
