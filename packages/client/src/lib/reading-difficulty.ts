import type { ReadingDifficulty } from "@sentence-bank/types";

/** The four difficulty levels, ascending, with the XP multiplier each applies to the session. */
export const READING_DIFFICULTIES: { value: ReadingDifficulty;
  label: string;
  multiplier: string; }[] = [
  {
    value: "very-easy",
    label: "Very easy",
    multiplier: "×0.25",
  },
  {
    value: "easy",
    label: "Easy",
    multiplier: "×0.5",
  },
  {
    value: "medium",
    label: "Medium",
    multiplier: "×1",
  },
  {
    value: "hard",
    label: "Hard",
    multiplier: "×1.25",
  },
];
