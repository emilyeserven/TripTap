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

/** One tag-matched section arranged for display: its own text (with page) plus any matched sub-items. */
export interface TaggedSectionNode {
  section: BookmarkSectionRef;
  label: string;
  children: TaggedSectionNode[];
}

/** The page (or range) a `page`-type section shows on its own, else null. */
function sectionOwnPage(s: BookmarkSectionRef): string | null {
  return s.type === "page" ? formatPage(s.startValue, s.endValue) : null;
}

/**
 * Display text for one tag-matched section: its own name (or, for a root whose real parent isn't itself
 * matched, its breadcrumb — to keep context), with its page number appended when it has one.
 */
function taggedSectionLabel(s: BookmarkSectionRef, breadcrumb: boolean): string {
  const page = sectionOwnPage(s);
  const base = breadcrumb ? s.label : (s.name || (page ? `p. ${page}` : s.label));
  return page && s.name ? `${base} (p. ${page})` : base;
}

/**
 * Arrange a bookmark's flat list of tag-matched sections into a shallow tree: a matched sub-item nests
 * under its matched parent so the parent name isn't repeated per child. A section is a root when its
 * parent isn't also matched (then it shows its breadcrumb rather than just its own name). Depth is capped
 * at 2, matching the host's Sections model. Requires the `name`/`parentId` populated on match refs.
 */
export function buildTaggedSectionTree(sections: BookmarkSectionRef[]): TaggedSectionNode[] {
  const matchedIds = new Set(sections.map(s => s.id));
  const isRoot = (s: BookmarkSectionRef) => !s.parentId || !matchedIds.has(s.parentId);
  return sections.filter(isRoot).map(root => ({
    section: root,
    label: taggedSectionLabel(root, Boolean(root.parentId)),
    children: sections
      .filter(s => s.parentId === root.id)
      .map(child => ({
        section: child,
        label: taggedSectionLabel(child, false),
        children: [],
      })),
  }));
}

/**
 * The bookmark's Sections tree flattened depth-first pre-order — each section immediately followed by
 * its descendants, preserving the upstream table-of-contents order. Cycle-guarded so a malformed
 * parent link can't loop forever. Shared by the multi-select picker (option order) and the range
 * summary (which section comes first/last).
 */
export function flattenSectionTree(nodes: BookmarkSectionNode[]): BookmarkSectionNode[] {
  const childrenOf = new Map<string | null, BookmarkSectionNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = childrenOf.get(key);
    if (list) list.push(n);
    else childrenOf.set(key, [n]);
  }
  const out: BookmarkSectionNode[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null) => {
    for (const n of childrenOf.get(parentId) ?? []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push(n);
      walk(n.id);
    }
  };
  walk(null);
  return out;
}

/**
 * Sort section references into the bookmark's table-of-contents order (their position in the flattened
 * Sections tree). Sections not found in the tree sort last, keeping their relative order. Used to store
 * a sheet's sections canonically so "first"/"last" mean document order, not click order.
 */
export function orderSectionsByTree(
  nodes: BookmarkSectionNode[],
  sections: BookmarkSectionRef[],
): BookmarkSectionRef[] {
  const order = new Map(flattenSectionTree(nodes).map((n, i) => [n.id, i]));
  const rank = (ref: BookmarkSectionRef) => order.get(ref.id) ?? Number.MAX_SAFE_INTEGER;
  // Stable sort (index tiebreak) so equal-rank sections keep their incoming order.
  return sections
    .map((ref, i) => ({
      ref,
      i,
    }))
    .sort((a, b) => rank(a.ref) - rank(b.ref) || a.i - b.i)
    .map(({
      ref,
    }) => ref);
}

/**
 * A compact summary of already-ordered section references for a title: the lone label when there's one,
 * else "first – last" so a span reads as a range instead of a long comma list. Null when empty. Callers
 * pass sections in the order they want summarized (store them via {@link orderSectionsByTree} first).
 */
export function sectionRangeLabel(sections: BookmarkSectionRef[]): string | null {
  if (sections.length === 0) return null;
  if (sections.length === 1) return sections[0].label;
  return `${sections[0].label} – ${sections[sections.length - 1].label}`;
}

/**
 * A compact summary of picked sections for a title: "first – last" in table-of-contents order (not
 * selection order) so a span of chapters reads as a range. Null when nothing is picked. Sections
 * outside the given tree sort last but still count.
 */
export function summarizeSectionRange(
  nodes: BookmarkSectionNode[],
  sections: BookmarkSectionRef[],
): string | null {
  return sectionRangeLabel(orderSectionsByTree(nodes, sections));
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
