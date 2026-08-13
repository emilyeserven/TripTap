import type { Writing } from "@sentence-bank/types";

/**
 * Naming for writing entries. A writing's body is a paragraph of Japanese, so using it as the
 * entry's name turns every list into a wall of text; the learner's own title leads instead, and
 * an untitled entry is named for the day it was written.
 */

/** Human-readable form of a writing's calendar day, e.g. "Aug 13, 2026". */
export function formatWritingDate(date: string): string {
  // `date` is a whole calendar day (`2026-08-13`), which parses as UTC midnight. Format that UTC
  // day directly — the viewer's local zone would shift it a day earlier anywhere west of UTC.
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The name a writing lists under: its title, else the day it was written. */
export function writingLabel(writing: Pick<Writing, "title" | "date">): string {
  return writing.title?.trim() || formatWritingDate(writing.date);
}
