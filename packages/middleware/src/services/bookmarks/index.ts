import type {
  BookmarkRecord,
  BookmarkResource,
  BookmarksSource,
  BookmarksTaxonomy,
  SentenceTermCategory,
  TagTermOption,
} from "@sentence-bank/types";

import type { BookmarksImage } from "@/services/bookmarks/util";

import { apiUrl, resolveBookmarksConfig } from "@/services/bookmarks/config";
import { BookmarksNotConfiguredError } from "@/services/bookmarks/errors";
import {
  createdOption,
  dedupeBookmarksByTitle,
  isRecord,
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
    const resource = toBookmarkResource(raw, null);
    if (resource && !seen.has(resource.id)) {
      seen.add(resource.id);
      out.push(resource);
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
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

/** Resolve the upstream "Runtime" custom-property id (by name, then by a duration number format). */
async function resolveRuntimePropertyId(baseUrl: string): Promise<string | null> {
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/custom-properties"));
  if (!Array.isArray(raw)) return null;
  const props = raw.filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object");
  const match = props.find(p => typeof p.name === "string" && p.name.toLowerCase() === "runtime")
    ?? props.find(p => p.type === "number" && p.numberFormat === "duration");
  return match && typeof match.id === "string" ? match.id : null;
}

/**
 * The bookmarks in the **resource** channel's configured source (Settings → Resources source),
 * filtered to those that have a runtime and widened for the "Find a Resource" browser (website +
 * runtime + media type), sorted by title (the client re-sorts by runtime). Empty when no resource
 * source is configured. A failure to read the custom-property list degrades runtime to null (which
 * then filters everything out) rather than failing the whole request.
 */
export async function listBookmarkResources(): Promise<BookmarkResource[]> {
  const {
    baseUrl, sources,
  } = await resolveBookmarksConfig();
  const source = sources.resource;
  if (!source) return [];
  const [children, runtimePropId] = await Promise.all([
    fetchVocabulary("resource"),
    resolveRuntimePropertyId(baseUrl).catch(() => null),
  ]);
  const raws = await listRawBookmarksForSource(baseUrl, source, children);
  return raws
    .map(r => toBookmarkResource(r, runtimePropId))
    .filter((r): r is BookmarkResource => r !== null)
    // Only surface resources that actually have a runtime (audio/video to listen to/shadow).
    .filter(r => r.runtimeSeconds != null)
    .sort((a, b) => a.title.localeCompare(b.title));
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
