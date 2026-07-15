import type { LessonSectionLayout, LessonWordColumns } from "@/stores/displayStore";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {

  useDisplayStore,
} from "@/stores/displayStore";

const SECTION_LAYOUTS: { value: LessonSectionLayout;
  label: string; }[] = [
  {
    value: "cards",
    label: "Cards",
  },
  {
    value: "tabs",
    label: "Tabs",
  },
];

const WORD_COLUMNS: { value: LessonWordColumns;
  label: string; }[] = [
  {
    value: 1,
    label: "1",
  },
  {
    value: 2,
    label: "2",
  },
  {
    value: 3,
    label: "3",
  },
];

/**
 * Page-local view options for the lesson view: how the sections are laid out (stacked collapsible cards
 * vs a tabbed switcher) and how many columns the Word notes wrap into. Both prefs persist via the
 * display store. Mirrors the segmented-control pattern of the global Display Options popover.
 */
export function LessonViewOptions() {
  const sectionLayout = useDisplayStore(s => s.lessonSectionLayout);
  const setSectionLayout = useDisplayStore(s => s.setLessonSectionLayout);
  const wordColumns = useDisplayStore(s => s.lessonWordColumns);
  const setWordColumns = useDisplayStore(s => s.setLessonWordColumns);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
        >
          <SlidersHorizontal className="size-4" />
          View options
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 space-y-4"
      >
        <div className="space-y-2">
          <span className="text-sm font-medium">Sections</span>
          <div
            className="flex overflow-hidden rounded-md border"
            role="group"
            aria-label="Section layout"
          >
            {SECTION_LAYOUTS.map(({
              value, label,
            }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={sectionLayout === value ? "default" : "ghost"}
                className="flex-1 rounded-none"
                aria-pressed={sectionLayout === value}
                onClick={() => setSectionLayout(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Word columns</span>
          <div
            className="flex overflow-hidden rounded-md border"
            role="group"
            aria-label="Word columns"
          >
            {WORD_COLUMNS.map(({
              value, label,
            }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={wordColumns === value ? "default" : "ghost"}
                className="flex-1 rounded-none"
                aria-pressed={wordColumns === value}
                onClick={() => setWordColumns(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
