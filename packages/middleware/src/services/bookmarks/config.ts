import type { BookmarksSource, SentenceTermCategory } from "@sentence-bank/types";

import { BookmarksNotConfiguredError } from "@/services/bookmarks/errors";
import { getBookmarksSettings } from "@/services/settings";

/** Fallback base URL for the bookmarks API when neither the DB nor env configures one. */
const DEFAULT_BOOKMARKS_URL = "https://eserve-raspi.seahorse-butterfly.ts.net";

export interface BookmarksConfig {
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
export async function resolveBookmarksConfig(): Promise<BookmarksConfig> {
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
export function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${trimmed}/api${path}`;
}
