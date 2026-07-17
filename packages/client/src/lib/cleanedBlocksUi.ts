import type { CleanedLineRole } from "@sentence-bank/types";

/** Compact input/select styling shared by the cleaned-blocks editor controls. */
export const INLINE_FIELD_CLASS
  = "rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";

/** The selectable per-line roles, in menu order. */
export const ROLES: { value: CleanedLineRole;
  label: string; }[] = [
  {
    value: "text",
    label: "Text",
  },
  {
    value: "translation",
    label: "Translation",
  },
  {
    value: "furigana",
    label: "Furigana",
  },
  {
    value: "structure",
    label: "Structure",
  },
  {
    value: "ignore",
    label: "Ignore",
  },
];

/** Left-border tints cycled per group so grouped lines read as one unit. */
export const GROUP_TINTS = [
  "border-l-blue-400",
  "border-l-emerald-400",
  "border-l-amber-400",
  "border-l-violet-400",
  "border-l-rose-400",
  "border-l-cyan-400",
];
