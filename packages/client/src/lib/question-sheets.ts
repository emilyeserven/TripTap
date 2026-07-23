import type { BookmarkSectionMatch, QuestionSheet } from "@sentence-bank/types";

/** One resource's worth of question sheets: the bookmark id (null = no resource) and its sheets, ordered. */
export interface QuestionSheetResourceGroup {
  bookmarkId: string | null;
  sheets: QuestionSheet[];
}

/**
 * Map of `bookmarkId → (sectionId → position)` built from every bookmark section, so a sheet can be
 * ranked by where its section falls in the resource's table of contents. Position is first-seen order
 * within each bookmark, which mirrors the upstream TOC order the sections endpoint returns (the same
 * ordering {@link BookmarkSectionSelect} relies on).
 */
export function buildTocIndex(
  allSections: BookmarkSectionMatch[],
): Map<string, Map<string, number>> {
  const index = new Map<string, Map<string, number>>();
  for (const match of allSections) {
    let sections = index.get(match.bookmarkId);
    if (!sections) {
      sections = new Map();
      index.set(match.bookmarkId, sections);
    }
    if (!sections.has(match.section.id)) sections.set(match.section.id, sections.size);
  }
  return index;
}

/**
 * A sheet's rank within its resource's TOC — the earliest TOC position among its sections, so a sheet
 * spanning several sections sorts by its first one. Unranked (no section, or none in the TOC) sort last.
 */
function tocRank(sheet: QuestionSheet, tocIndex: Map<string, Map<string, number>>): number {
  if (!sheet.bookmarkId || sheet.sections.length === 0) return Infinity;
  const positions = tocIndex.get(sheet.bookmarkId);
  if (!positions) return Infinity;
  return Math.min(
    ...sheet.sections.map(s => positions.get(s.id) ?? Infinity),
  );
}

/** The first integer in a free-text page string ("p. 12–13" → 12); Infinity when it has no number. */
function pageNumber(page: string | null): number {
  const match = page?.match(/\d+/);
  return match ? Number(match[0]) : Infinity;
}

/**
 * Group question sheets by their resource (`bookmarkId`), preserving the input's first-seen resource
 * order and pushing the "no resource" bucket (bookmarkId `null`) to the end. Within each group, sheets
 * are ordered by their section's TOC position ({@link buildTocIndex}), then by page number — so a
 * group whose sheets have no sections orders purely by page. Sheets with neither a ranked section nor
 * a page number keep their incoming order (createdAt desc).
 */
export function groupSheetsByResource(
  sheets: QuestionSheet[],
  tocIndex: Map<string, Map<string, number>>,
): QuestionSheetResourceGroup[] {
  const buckets = new Map<string | null, QuestionSheet[]>();
  for (const sheet of sheets) {
    const key = sheet.bookmarkId ?? null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(sheet);
    else buckets.set(key, [sheet]);
  }

  const groups: QuestionSheetResourceGroup[] = [];
  let noResource: QuestionSheetResourceGroup | null = null;
  for (const [bookmarkId, bucket] of buckets) {
    // Sort by TOC rank, then page number (so a section-less group orders purely by page). A stable
    // sort keeps sheets tied on both in their incoming createdAt-desc order.
    const ordered = [...bucket].sort((a, b) =>
      tocRank(a, tocIndex) - tocRank(b, tocIndex)
      || pageNumber(a.page) - pageNumber(b.page));
    const group = {
      bookmarkId,
      sheets: ordered,
    };
    if (bookmarkId === null) noResource = group;
    else groups.push(group);
  }
  if (noResource) groups.push(noResource);
  return groups;
}
