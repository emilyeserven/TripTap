import type {
  BookmarkRecord,
  BookmarksSource,
  BookmarksTaxonomy,
  BookmarkSection,
  SentenceTermCategory,
  TagTermOption,
} from "@sentence-bank/types";
import { getBookmarksSettings } from "@/services/settings";
import { BookmarksNotConfiguredError, BookmarksUnavailableError } from "@/services/bookmarks/errors";
import { fetchBookmarksJson } from "@/services/bookmarks/util";

export { BookmarksNotConfiguredError, BookmarksUnavailableError } from "@/services/bookmarks/errors";

/** Fallback base URL for the bookmarks API when neither the DB nor env configures one. */
const DEFAULT_BOOKMARKS_URL = "https://eserve-raspi.seahorse-butterfly.ts.net";

interface BookmarksConfig {
  baseUrl: string;
  /** The configured source per tagging channel; any may be null when that channel is unconfigured. */
  sources: Record<SentenceTermCategory, BookmarksSource | null>;
}

/**
 * Resolve the effective bookmarks configuration for one request. The endpoint URL comes from the DB
 * Settings (entered on the Settings page) and takes precedence over `BOOKMARKS_API_URL`, then a
 * hardcoded default. The DB lookup is best-effort so this keeps working (and unit tests run) without
 * a database.
 */
async function resolveBookmarksConfig(): Promise<BookmarksConfig> {
  let dbEndpoint: string | null = null;
  const sources: Record<SentenceTermCategory, BookmarksSource | null> = {
    vocabulary: null,
    grammar: null,
    general: null,
    resource: null,
    listening: null,
  };
  try {
    const settings = await getBookmarksSettings();
    dbEndpoint = settings.endpointUrl;
    sources.vocabulary = settings.source;
    sources.grammar = settings.grammarSource;
    sources.general = settings.generalSource;
    sources.resource = settings.resourceSource;
    sources.listening = settings.listeningSource;
  }
  catch {
    // Database unavailable — fall back to environment/default.
  }
  const baseUrl = dbEndpoint || process.env.BOOKMARKS_API_URL || DEFAULT_BOOKMARKS_URL;
  if (!baseUrl) throw new BookmarksNotConfiguredError();
  return {
    baseUrl,
    sources,
  };
}

/** Join a configured base URL with an `/api/...` path, tolerating a trailing slash or `/api` suffix. */
function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${trimmed}/api${path}`;
}

/** Pull the fields we depend on from an upstream tag/term object, ignoring the rest. */
function toOption(raw: unknown): TagTermOption | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  return {
    id: o.id,
    name: o.name,
    parentId: typeof o.parentId === "string" ? o.parentId : null,
    slug: typeof o.slug === "string" ? o.slug : null,
    description: typeof o.description === "string" ? o.description : null,
  };
}

function toOptions(raw: unknown): TagTermOption[] {
  return Array.isArray(raw) ? raw.map(toOption).filter((o): o is TagTermOption => o !== null) : [];
}

/** Pull the fields we depend on from an upstream taxonomy object. */
function toTaxonomy(raw: unknown): BookmarksTaxonomy | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  return {
    id: o.id,
    name: o.name,
    slug: typeof o.slug === "string" ? o.slug : "",
    hierarchical: Boolean(o.hierarchical),
    singleValue: Boolean(o.singleValue),
    icon: typeof o.icon === "string" ? o.icon : null,
    termCount: typeof o.termCount === "number" ? o.termCount : 0,
  };
}

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

/**
 * Recursively flatten a bookmark's `sectionsValues[].sections[]` tree into the timestamp sections we
 * surface. Only entries with `type === "timestamp"` and both a start and end value are kept.
 */
function flattenTimestampSections(raw: unknown): BookmarkSection[] {
  const out: BookmarkSection[] = [];
  const walk = (sections: unknown): void => {
    if (!Array.isArray(sections)) return;
    for (const s of sections) {
      if (!s || typeof s !== "object") continue;
      const o = s as Record<string, unknown>;
      if (
        o.type === "timestamp"
        && typeof o.startValue === "string"
        && o.startValue !== ""
        && typeof o.endValue === "string"
        && o.endValue !== ""
      ) {
        out.push({
          id: typeof o.id === "string" ? o.id : `${out.length}`,
          label: typeof o.name === "string" ? o.name : null,
          startValue: o.startValue,
          endValue: o.endValue,
        });
      }
      if (Array.isArray(o.children)) walk(o.children);
    }
  };
  if (Array.isArray(raw)) {
    for (const group of raw) {
      if (group && typeof group === "object") walk((group as Record<string, unknown>).sections);
    }
  }
  return out;
}

/** Pull the fields we depend on from an upstream bookmark record, optionally flattening its sections. */
function toBookmarkRecord(raw: unknown, includeSections: boolean): BookmarkRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  return {
    id: o.id,
    title: o.title,
    url: typeof o.url === "string" ? o.url : null,
    sections: includeSections ? flattenTimestampSections(o.sectionsValues) : [],
  };
}

/** Bookmarks tagged with the given tag id, using a caller-resolved base URL. Sections omitted. */
async function listBookmarksByTag(baseUrl: string, tagId: string): Promise<BookmarkRecord[]> {
  const raw = await fetchBookmarksJson<unknown>(
    apiUrl(baseUrl, `/bookmarks?tags=${encodeURIComponent(tagId)}`),
  );
  return Array.isArray(raw)
    ? raw.map(r => toBookmarkRecord(r, false)).filter((b): b is BookmarkRecord => b !== null)
    : [];
}

/** One bookmark by id, using a caller-resolved base URL. Sections omitted (list rows don't need them). */
async function listBookmarkById(baseUrl: string, id: string): Promise<BookmarkRecord | null> {
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, `/bookmarks/${encodeURIComponent(id)}`));
  return toBookmarkRecord(raw, false);
}

/** Bookmarks tagged with the given tag id, newest-app-order. Sections are not included in the list. */
export async function listBookmarks(tagId: string): Promise<BookmarkRecord[]> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  return listBookmarksByTag(baseUrl, tagId);
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

/** Dedupe bookmark records by id (first occurrence wins) and sort by title. */
function dedupeBookmarksByTitle(records: BookmarkRecord[]): BookmarkRecord[] {
  const byId = new Map<string, BookmarkRecord>();
  for (const record of records) {
    if (!byId.has(record.id)) byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * All bookmarks across one channel's configured source, deduped by id and sorted by title. The
 * upstream host lists bookmarks per id, but tags and taxonomy terms live in different id spaces, so
 * the two source kinds resolve differently:
 *
 * - **tag** — `?tags=` accepts tag ids directly, so query the parent tag plus each of its child tags.
 * - **taxonomy** — `?tags=` never matches taxonomy term ids, so gather the terms in scope (the
 *   drilled-down term plus its children, or the whole taxonomy when there's no drill-down) and pull
 *   the bookmarks assigned to any of them from the taxonomy assignment map.
 */
export async function listBookmarksForCategory(
  category: SentenceTermCategory = "vocabulary",
): Promise<BookmarkRecord[]> {
  const {
    baseUrl, sources,
  } = await resolveBookmarksConfig();
  const source = sources[category];
  if (!source) return [];
  const children = await fetchVocabulary(category);

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
    const records = await Promise.all(ids.map(id => listBookmarkById(baseUrl, id)));
    return dedupeBookmarksByTitle(records.filter((b): b is BookmarkRecord => b !== null));
  }

  const ids = [...new Set([source.id, ...children.map(item => item.id)])];
  const lists = await Promise.all(ids.map(id => listBookmarksByTag(baseUrl, id)));
  return dedupeBookmarksByTitle(lists.flat());
}

/** A single bookmark by id, including its flattened timestamp sections. Null when not found/unreadable. */
export async function getBookmark(id: string): Promise<BookmarkRecord | null> {
  const {
    baseUrl,
  } = await resolveBookmarksConfig();
  const raw = await fetchBookmarksJson<unknown>(apiUrl(baseUrl, `/bookmarks/${encodeURIComponent(id)}`));
  return toBookmarkRecord(raw, true);
}

/** Normalize an upstream create response into a {@link TagTermOption}, or fail if it can't be read. */
function createdOption(raw: unknown): TagTermOption {
  const option = toOption(raw);
  if (!option) {
    throw new BookmarksUnavailableError("Bookmarks host returned an unexpected create response");
  }
  return option;
}

/** Create a taxonomy term, optionally nested under a parent term. Returns the created term. */
export async function createTerm(
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
export async function createTag(
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
