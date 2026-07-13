import type { WritingPromptDifficulty } from "@sentence-bank/types";

import { WRITING_PROMPT_DIFFICULTIES } from "@sentence-bank/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A dropdown for picking a writing prompt's difficulty tag. Shared by the create/edit/bulk forms. */
export function DifficultySelect({
  value,
  onChange,
  id,
}: {
  value: WritingPromptDifficulty;
  onChange: (value: WritingPromptDifficulty) => void;
  id?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={v => onChange(v as WritingPromptDifficulty)}
    >
      <SelectTrigger
        id={id}
        className="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WRITING_PROMPT_DIFFICULTIES.map(level => (
          <SelectItem
            key={level}
            value={level}
          >
            {level}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
