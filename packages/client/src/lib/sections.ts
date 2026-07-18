import type { BookmarkSectionRef, ShadowingSegment } from "@sentence-bank/types";

import { newId } from "@/lib/id";
import { parseSectionTime } from "@/lib/time";

/**
 * Convert a timestamp section reference into a shadowing segment, or null when it isn't a timestamp
 * section or its start/end can't be parsed. Lets a picked bookmark section seed a practice loop.
 */
export function sectionRefToSegment(ref: BookmarkSectionRef): ShadowingSegment | null {
  if (ref.type !== "timestamp") return null;
  const startMs = parseSectionTime(ref.startValue ?? "");
  const endMs = parseSectionTime(ref.endValue ?? "");
  if (startMs === null || endMs === null) return null;
  return {
    id: newId(),
    label: ref.label,
    startMs,
    endMs,
    maxReplays: null,
    gapMs: null,
  };
}

/** The playback start (ms) of a timestamp section reference, or null when there's no parseable start. */
export function sectionRefStartMs(ref: BookmarkSectionRef | null): number | null {
  if (!ref || ref.type !== "timestamp") return null;
  return parseSectionTime(ref.startValue ?? "");
}

/**
 * The page (or "start–end" range) a `page`-type section points at, for prefilling a free-text page
 * field. Null for non-page sections or a page section with no start value.
 */
export function sectionRefPage(ref: BookmarkSectionRef | null): string | null {
  if (!ref || ref.type !== "page" || !ref.startValue) return null;
  return ref.endValue && ref.endValue !== ref.startValue
    ? `${ref.startValue}–${ref.endValue}`
    : ref.startValue;
}
