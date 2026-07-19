import type { BookmarkSectionNode, BookmarkSectionRef, ShadowingSegment } from "@sentence-bank/types";

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

/** Format a page (or "start–end" range) from a page node's values; null when it has no start value. */
function formatPage(startValue: string | null, endValue: string | null): string | null {
  if (!startValue) return null;
  return endValue && endValue !== startValue ? `${startValue}–${endValue}` : startValue;
}

/**
 * The page (or "start–end" range) a section points at, for prefilling a free-text page field. Walks up
 * the Sections tree: if the picked section has no page of its own, its nearest paged ancestor's page is
 * used (a sub-item under a paged unit inherits that unit's page). Null when neither it nor any ancestor
 * is a page section. `nodes` is the bookmark's full Sections tree (flat, `parentId`-linked).
 */
export function resolveSectionPage(nodes: BookmarkSectionNode[], nodeId: string | null): string | null {
  if (!nodeId) return null;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const seen = new Set<string>();
  let cur = byId.get(nodeId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.type === "page") {
      const page = formatPage(cur.startValue, cur.endValue);
      if (page) return page;
    }
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return null;
}
