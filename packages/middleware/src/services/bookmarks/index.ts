import type {
  BookmarkRecord,
  BookmarkResource,
  BookmarkResourceList,
  BookmarkSectionMatch,
  BookmarksSource,
  BookmarksTaxonomy,
  ComplexityScale,
  SentenceTermCategory,
  TagTermOption,
} from "@sentence-bank/types";

import type { BookmarksImage } from "@/services/bookmarks/util";
import type { ResourcePropertyIds } from "@/services/bookmarks/mappers";

import { apiUrl, resolveBookmarksConfig } from "@/services/bookmarks/config";
import { BookmarksNotConfiguredError } from "@/services/bookmarks/errors";
import {
  createdOption,
  dedupeBookmarksByTitle,
  isRecord,
  matchSectionsByTag,
  toBookmarkRecord,
  toBookmarkResource,
  toOptions,
  toTaxonomy,
} from "@/services/bookmarks/mappers";
import { fetchBookmarksImage, fetchBookmarksJson } from "@/services/bookmarks/util";

export { BookmarksNotConfiguredError, BookmarksUnavailableError } from "@/services/bookmarks/errors";
export { toBookmarkResource } from "@/services/bookmarks/mappers";

/** All flat tags from the bookmarks app. */
export async function fetchTags(): Promise<TagTermOption[]> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  return toOptions(await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/tags")));
}

/** All taxonomies from the bookmarks app. */
export async function fetchTaxonomies(): Promise<BookmarksTaxonomy[]> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/taxonomies"));
  return Array.isArray(raw)
    ? raw.map(toTaxonomy).filter((t): t is BookmarksTaxonomy => t !== null)
    : [];
}

/** The terms belonging to one taxonomy. */
export async function fetchTerms(taxonomyId: string): Promise<TagTermOption[]> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  return toOptions(
    await fetchBookmarksJson<unknown>(apiUrl(baseUrl, `/taxonomies/${encodeURIComponent(taxonomyId)}/terms`)),
  );
}

/**
 * The selectable vocabulary for one channel's configured source: a parent tag's direct children
 * (kind "tag") or a taxonomy's terms (kind "taxonomy"). When a taxonomy source drills into a parent
 * term (`termId`), only that term's direct children are returned. Returns `[]` when the channel has no
 * source configured or a stale parent tag/term has no children.
 */
export async function fetchVocabulary(
  category: SentenceTermCategory = "vocabulary",
): Promise<TagTermOption[]> {
  const {
    baseUrl, sources,
  } = await resolveBookmarksConfig();
  const source = sources[category];
  if (!source) return [];
  if (source.kind === "taxonomy") {
    const terms = toOptions(
      await fetchBookmarksJson<unknown>(apiUrl(baseUrl, `/taxonomies/${encodeURIComponent(source.id)}/terms`)),
    );
    return source.termId ? terms.filter(t => t.parentId === source.termId) : terms;
  }
  const tags = toOptions(await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/tags")));
  return tags.filter(t => t.parentId === source.id);
}

/** Raw upstream bookmark objects tagged with the given tag id, using a caller-resolved base URL. */
async function fetchRawBookmarksByTag(baseUrl: string, tagId: string): Promise<Record<string, unknown>[]> {
  const raw = await fetchBookmarksJson<unknown>(
    apiUrl(baseUrl, `/bookmarks?tags=${encodeURIComponent(tagId)}`),
  );
  return Array.isArray(raw) ? raw.filter(isRecord) : [];
}

/** The raw upstream bookmark object for one id, or null when not found/unreadable. */
async function fetchRawBookmarkById(baseUrl: string, id: string): Promise<Record<string, unknown> | null> {
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, `/bookmarks/${encodeURIComponent(id)}`));
  return isRecord(raw) ? raw : null;
}

/**
 * The bookmark → assigned-term-id map for one taxonomy (owner type `bookmark`). The upstream host
 * cannot filter bookmarks by a taxonomy term through `?tags=` (that only matches tags), so a taxonomy
 * source resolves its bookmarks through these assignments instead. Shape: `{ [bookmarkId]: termId[] }`.
 */
async function fetchTaxonomyBookmarkAssignments(
  baseUrl: string,
  taxonomyId: string,
): Promise<Record<string, string[]>> {
  const raw = await fetchBookmarksJson<unknown>(
    apiUrl(baseUrl, `/taxonomy-assignments/by-owner-type/${encodeURIComponent(taxonomyId)}/bookmark`),
  );
  const out: Record<string, string[]> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [bookmarkId, termIds] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(termIds)) {
        out[bookmarkId] = termIds.filter((t): t is string => typeof t === "string");
      }
    }
  }
  return out;
}

/**
 * The raw upstream bookmark objects for one configured source, deduped by id. Shared by the narrow
 * per-channel record list and the widened "Find a Resource" browser. The upstream host lists bookmarks
 * per id, but tags and taxonomy terms live in different id spaces, so the two source kinds resolve
 * differently:
 *
 * - **tag** — `?tags=` accepts tag ids directly, so query the parent tag plus each of its child tags.
 * - **taxonomy** — `?tags=` never matches taxonomy term ids, so gather the terms in scope (the
 *   drilled-down term plus its children, or the whole taxonomy when there's no drill-down) and pull
 *   the bookmarks assigned to any of them from the taxonomy assignment map.
 */
async function listRawBookmarksForSource(
  baseUrl: string,
  source: BookmarksSource,
  children: TagTermOption[],
): Promise<Record<string, unknown>[]> {
  let raws: Record<string, unknown>[];
  if (source.kind === "taxonomy") {
    const targetTerms = new Set<string>([
      ...(source.termId ? [source.termId] : []),
      ...children.map(item => item.id),
    ]);
    if (targetTerms.size === 0) return [];
    const assignments = await fetchTaxonomyBookmarkAssignments(baseUrl, source.id);
    const ids = Object.entries(assignments)
      .filter(([, termIds]) => termIds.some(termId => targetTerms.has(termId)))
      .map(([bookmarkId]) => bookmarkId);
    const fetched = await Promise.all(ids.map(id => fetchRawBookmarkById(baseUrl, id)));
    raws = fetched.filter((r): r is Record<string, unknown> => r !== null);
  }
  else {
    const ids = [...new Set([source.id, ...children.map(item => item.id)])];
    const lists = await Promise.all(ids.map(id => fetchRawBookmarksByTag(baseUrl, id)));
    raws = lists.flat();
  }
  const byId = new Map<string, Record<string, unknown>>();
  for (const raw of raws) {
    if (typeof raw.id === "string" && !byId.has(raw.id)) byId.set(raw.id, raw);
  }
  return [...byId.values()];
}

/** All bookmarks across one channel's configured source, deduped by id and sorted by title. */
export async function listBookmarksForCategory(
  category: SentenceTermCategory = "vocabulary",
): Promise<BookmarkRecord[]> {
  const {
    baseUrl, sources,
  } = await resolveBookmarksConfig();
  const source = sources[category];
  if (!source) return [];
  const children = await fetchVocabulary(category);
  const raws = await listRawBookmarksForSource(baseUrl, source, children);
  return dedupeBookmarksByTitle(
    raws.map(r => toBookmarkRecord(r, false)).filter((b): b is BookmarkRecord => b !== null),
  );
}

/**
 * All bookmarks carrying a specific tag id, deduped by id and sorted by title. Unlike
 * {@link listBookmarksForCategory} (which resolves a whole configured source), this targets one tag
 * directly — used to auto-gather the bookmarks under a grammar note's Grammar Source tag.
 */
export async function listBookmarksByTag(tagId: string): Promise<BookmarkResource[]> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  const raws = await fetchRawBookmarksByTag(baseUrl, tagId);
  // Widen to the resource shape (thumbnail + website) so the grammar note can show images and sources.
  // Runtime isn't needed here, so skip resolving the runtime property (pass null → runtimeSeconds null).
  const seen = new Set<string>();
  const out: BookmarkResource[] = [];
  for (const raw of raws) {
    const resource = toBookmarkResource(raw, {
      runtimePropId: null,
      complexityPropId: null,
    });
    if (resource && !seen.has(resource.id)) {
      seen.add(resource.id);
      out.push(resource);
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Every bookmark **section** whose upstream `tagIds` include a specific tag id, across all bookmarks,
 * sorted by bookmark title then section label. The host can't filter sections by tag (`?tags=` only
 * matches bookmark-level tags), so this fetches the whole collection once — each bookmark already carries
 * its `sectionsValues` — and walks their sections. Backs the grammar note's "sections tagged with this
 * grammar point" gather.
 */
export async function listSectionsByTag(tagId: string): Promise<BookmarkSectionMatch[]> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/bookmarks"));
  const bookmarks = Array.isArray(raw) ? raw.filter(isRecord) : [];
  const out: BookmarkSectionMatch[] = [];
  for (const b of bookmarks) {
    if (typeof b.id !== "string") continue;
    // Resolves the (renamed) title and the cover image URL; runtime/complexity aren't needed here.
    const resource = toBookmarkResource(b, {
      runtimePropId: null,
      complexityPropId: null,
    });
    const sections = matchSectionsByTag(b.sectionsValues, tagId);
    for (const section of sections) {
      out.push({
        bookmarkId: b.id,
        bookmarkTitle: resource?.title ?? (typeof b.title === "string" ? b.title : b.id),
        bookmarkUrl: typeof b.url === "string" ? b.url : null,
        imageUrl: resource?.imageUrl ?? null,
        mediaType: resource?.mediaType ?? null,
        tagIds: resource?.tagIds ?? [],
        section,
      });
    }
  }
  return out.sort((a, b) =>
    a.bookmarkTitle.localeCompare(b.bookmarkTitle) || a.section.label.localeCompare(b.section.label));
}

/** A single bookmark by id, including its flattened timestamp sections. Null when not found/unreadable. */
export async function getBookmark(id: string): Promise<BookmarkRecord | null> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, `/bookmarks/${encodeURIComponent(id)}`));
  return toBookmarkRecord(raw, true);
}

/**
 * Proxy one bookmark's thumbnail bytes from the host (the `image.url` surfaced on {@link BookmarkResource}
 * points at `/api/bookmarks/{bookmarkId}/images/{imageId}`, so the browser can load it same-origin). The
 * optional `query` re-attaches the upstream cache-buster (`?v=…`) the image URL was stamped with.
 */
export async function getBookmarkImage(
  bookmarkId: string,
  imageId: string,
  query = "",
): Promise<BookmarksImage> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  const path = `/bookmarks/${encodeURIComponent(bookmarkId)}/images/${encodeURIComponent(imageId)}`;
  return fetchBookmarksImage(apiUrl(baseUrl, path) + query);
}

/**
 * Proxy one bookmark's screenshot bytes from the host. A screenshot-only bookmark surfaces its
 * `screenshot.url` (`/api/bookmarks/{bookmarkId}/screenshot`) as its image, which the browser loads
 * same-origin through this proxy. The optional `query` re-attaches the upstream `?v=…` cache-buster.
 */
export async function getBookmarkScreenshot(
  bookmarkId: string,
  query = "",
): Promise<BookmarksImage> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  const path = `/bookmarks/${encodeURIComponent(bookmarkId)}/screenshot`;
  return fetchBookmarksImage(apiUrl(baseUrl, path) + query);
}

/** The resolved resource custom properties: ids to read out of `numberValues`, plus the complexity scale. */
interface ResolvedResourceProperties extends ResourcePropertyIds {
  complexityScale: ComplexityScale | null;
}

/** A string→string label map from an unknown value, keeping only string labels; `{}` when not an object. */
function readLabelMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [level, label] of Object.entries(value as Record<string, unknown>)) {
      if (typeof label === "string" && label !== "") out[level] = label;
    }
  }
  return out;
}

/** The largest numeric key in a label map (levels are stringified numbers), or null when none parse. */
function maxLabelLevel(labels: Record<string, string>): number | null {
  let max: number | null = null;
  for (const key of Object.keys(labels)) {
    const n = Number(key);
    if (Number.isInteger(n) && (max === null || n > max)) max = n;
  }
  return max;
}

/**
 * Read the complexity-scale metadata off its custom-property definition, tolerating the various shapes
 * the bookmarks app emits. `min` honors `ratingAllowZero`; `max` falls back to the highest labeled level
 * then to 5. Beyond the default `ratingLabels` scheme, each `ratingCategoryLabels` entry becomes a named
 * scheme the user can switch to (its category id resolved to a name via `categoryNames`).
 */
function toComplexityScale(prop: Record<string, unknown>, categoryNames: Map<string, string>): ComplexityScale {
  const labels = readLabelMap(prop.ratingLabels);
  const min = prop.ratingAllowZero === false ? 1 : 0;
  const max = typeof prop.ratingMax === "number"
    ? prop.ratingMax
    : maxLabelLevel(labels) ?? 5;

  const schemes: ComplexityScale["schemes"] = [{
    id: "default",
    name: "Default",
    labels,
  }];
  if (prop.ratingCategoryLabels && typeof prop.ratingCategoryLabels === "object"
    && !Array.isArray(prop.ratingCategoryLabels)) {
    for (const [categoryId, raw] of Object.entries(prop.ratingCategoryLabels as Record<string, unknown>)) {
      const schemeLabels = readLabelMap(raw);
      if (Object.keys(schemeLabels).length === 0) continue;
      schemes.push({
        id: categoryId,
        name: categoryNames.get(categoryId) ?? "Category",
        labels: schemeLabels,
      });
    }
  }

  return {
    min,
    max,
    labels,
    schemes,
  };
}

/** Resolve bookmarks-app category ids → display names, tolerating a bare array or a `{ categories }` wrapper. */
async function fetchCategoryNames(baseUrl: string): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/categories"));
    const list = Array.isArray(raw)
      ? raw
      : (raw && typeof raw === "object"
        ? ((raw as Record<string, unknown>).categories ?? (raw as Record<string, unknown>).items)
        : null);
    if (Array.isArray(list)) {
      for (const c of list) {
        if (c && typeof c === "object") {
          const cat = c as Record<string, unknown>;
          if (typeof cat.id === "string" && typeof cat.name === "string") names.set(cat.id, cat.name);
        }
      }
    }
  }
  catch {
    // Category names are cosmetic (scheme labels); degrade to ids-only rather than fail the request.
  }
  return names;
}

/**
 * Resolve the upstream custom properties the Collections browser reads: the "Runtime" duration id (by
 * name, then by a duration number format) and the "Complexity Scale" rating id + scale (by name/slug —
 * matched specifically because the host has more than one `ratingScale` property).
 */
async function resolveResourceProperties(baseUrl: string): Promise<ResolvedResourceProperties> {
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/custom-properties"));
  const empty: ResolvedResourceProperties = {
    runtimePropId: null,
    complexityPropId: null,
    complexityScale: null,
  };
  if (!Array.isArray(raw)) return empty;
  const props = raw.filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object");

  const runtime = props.find(p => typeof p.name === "string" && p.name.toLowerCase() === "runtime")
    ?? props.find(p => p.type === "number" && p.numberFormat === "duration");

  const complexity = props.find(p =>
    p.type === "ratingScale"
    && ((typeof p.name === "string" && p.name.toLowerCase().includes("complexity"))
      || p.slug === "complexity-scale"));

  // The "Progress" itemInItems property (matched by name/slug — the host also has a "Page Range"
  // itemInItems). Capture its default text segments so the mapper can compose the display label.
  const progress = props.find(p =>
    p.type === "itemInItems"
    && ((typeof p.name === "string" && p.name.toLowerCase() === "progress") || p.slug === "progress"));

  const favorite = props.find(p =>
    p.type === "boolean"
    && ((typeof p.name === "string" && p.name.toLowerCase() === "favorite") || p.slug === "favorite"));

  // The "Content Status" choices property (e.g. reading / shortlist / finished) — informs which
  // resources the Start Something page prefers.
  const contentStatus = props.find(p =>
    p.type === "choices"
    && ((typeof p.name === "string" && p.name.toLowerCase() === "content status")
      || p.slug === "content-status"));

  // Resolve category names only when the complexity property carries per-category label schemes.
  const hasCategoryLabels = Boolean(complexity?.ratingCategoryLabels
    && typeof complexity.ratingCategoryLabels === "object"
    && !Array.isArray(complexity.ratingCategoryLabels)
    && Object.keys(complexity.ratingCategoryLabels).length > 0);
  const categoryNames = hasCategoryLabels ? await fetchCategoryNames(baseUrl) : new Map<string, string>();

  return {
    runtimePropId: runtime && typeof runtime.id === "string" ? runtime.id : null,
    complexityPropId: complexity && typeof complexity.id === "string" ? complexity.id : null,
    complexityScale: complexity ? toComplexityScale(complexity, categoryNames) : null,
    progress: progress && typeof progress.id === "string"
      ? {
        id: progress.id,
        before: typeof progress.itemInItemsBeforeText === "string" ? progress.itemInItemsBeforeText : "",
        between: typeof progress.itemInItemsBetweenText === "string" ? progress.itemInItemsBetweenText : " of ",
        after: typeof progress.itemInItemsAfterText === "string" ? progress.itemInItemsAfterText : "",
      }
      : null,
    favoritePropId: favorite && typeof favorite.id === "string" ? favorite.id : null,
    contentStatusPropId: contentStatus && typeof contentStatus.id === "string" ? contentStatus.id : null,
  };
}

/**
 * The bookmarks in the **resource** channel's configured source (Settings → Resources source), widened
 * for the Collections browser (website + runtime + media type + complexity) and sorted by title, plus
 * the complexity-scale metadata for the level filter. Unlike the old video-only "Find a Resource" list,
 * this surfaces **every** bookmark in the source regardless of media type; the client gates its
 * per-medium actions (Listening/Shadowing vs Reading/Writing) on the runtime instead. Empty when no
 * resource source is configured. A failure to read the custom-property list degrades runtime/complexity
 * to null rather than failing the whole request.
 */
export async function listBookmarkResources(): Promise<BookmarkResourceList> {
  const {
    baseUrl, sources,
  } = await resolveBookmarksConfig();
  const source = sources.resource;
  if (!source) return {
    resources: [],
    complexityScale: null,
  };
  const [children, props] = await Promise.all([
    fetchVocabulary("resource"),
    resolveResourceProperties(baseUrl).catch(() => ({
      runtimePropId: null,
      complexityPropId: null,
      complexityScale: null,
    })),
  ]);
  const raws = await listRawBookmarksForSource(baseUrl, source, children);
  const resources = raws
    .map(r => toBookmarkResource(r, props))
    .filter((r): r is BookmarkResource => r !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
  return {
    resources,
    complexityScale: props.complexityScale,
  };
}

/** Create a taxonomy term, optionally nested under a parent term. Returns the created term. */
async function createTerm(
  baseUrl: string,
  taxonomyId: string,
  name: string,
  parentId?: string | null,
): Promise<TagTermOption> {
  const body: Record<string, unknown> = {
    name,
  };
  if (parentId) body.parentId = parentId;
  return createdOption(
    await fetchBookmarksJson<unknown>(
      apiUrl(baseUrl, `/taxonomies/${encodeURIComponent(taxonomyId)}/terms`),
      {
        method: "POST",
        body,
      },
    ),
  );
}

/** Create a child tag nested under a parent tag. Returns the created tag. */
async function createTag(
  baseUrl: string,
  name: string,
  parentId: string,
): Promise<TagTermOption> {
  return createdOption(
    await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/tags"), {
      method: "POST",
      body: {
        name,
        parentId,
      },
    }),
  );
}

/**
 * Create a new term in the bookmarks app under one channel's configured source and return it as a
 * selectable option. A taxonomy source creates a taxonomy term (nested under its drill-down parent
 * term when set); a parent-tag source creates a child tag. Throws {@link BookmarksNotConfiguredError}
 * when the channel has no source configured.
 */
export async function createVocabularyTerm(
  name: string,
  category: SentenceTermCategory = "vocabulary",
): Promise<TagTermOption> {
  const {
    baseUrl, sources,
  } = await resolveBookmarksConfig();
  const source = sources[category];
  if (!source) throw new BookmarksNotConfiguredError();
  if (source.kind === "taxonomy") {
    return createTerm(baseUrl, source.id, name, source.termId ?? undefined);
  }
  return createTag(baseUrl, name, source.id);
}
