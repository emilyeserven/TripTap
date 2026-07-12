import type { BookmarksSource, BookmarksTaxonomy, TagTermOption } from "@sentence-bank/types";
import { getBookmarksSettings } from "@/services/settings";
import { BookmarksNotConfiguredError } from "@/services/bookmarks/errors";
import { fetchBookmarksJson } from "@/services/bookmarks/util";

export { BookmarksNotConfiguredError, BookmarksUnavailableError } from "@/services/bookmarks/errors";

/** Fallback base URL for the bookmarks API when neither the DB nor env configures one. */
const DEFAULT_BOOKMARKS_URL = "https://eserve-raspi.seahorse-butterfly.ts.net";

interface BookmarksConfig {
  baseUrl: string;
  source: BookmarksSource | null;
}

/**
 * Resolve the effective bookmarks configuration for one request. The endpoint URL comes from the DB
 * Settings (entered on the Settings page) and takes precedence over `BOOKMARKS_API_URL`, then a
 * hardcoded default. The DB lookup is best-effort so this keeps working (and unit tests run) without
 * a database.
 */
async function resolveBookmarksConfig(): Promise<BookmarksConfig> {
  let dbEndpoint: string | null = null;
  let source: BookmarksSource | null = null;
  try {
    const settings = await getBookmarksSettings();
    dbEndpoint = settings.endpointUrl;
    source = settings.source;
  }
  catch {
    // Database unavailable — fall back to environment/default.
  }
  const baseUrl = dbEndpoint || process.env.BOOKMARKS_API_URL || DEFAULT_BOOKMARKS_URL;
  if (!baseUrl) throw new BookmarksNotConfiguredError();
  return {
    baseUrl,
    source,
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
 * The selectable vocabulary for the configured source: a parent tag's direct children (kind "tag") or
 * a taxonomy's terms (kind "taxonomy"). Returns `[]` when no source is configured or a stale parent
 * tag has no children.
 */
export async function fetchVocabulary(): Promise<TagTermOption[]> {
  const {
    baseUrl, source,
  } = await resolveBookmarksConfig();
  if (!source) return [];
  if (source.kind === "taxonomy") {
    return toOptions(
      await fetchBookmarksJson<unknown>(apiUrl(baseUrl, `/taxonomies/${encodeURIComponent(source.id)}/terms`)),
    );
  }
  const tags = toOptions(await fetchBookmarksJson<unknown>(apiUrl(baseUrl, "/tags")));
  return tags.filter(t => t.parentId === source.id);
}
