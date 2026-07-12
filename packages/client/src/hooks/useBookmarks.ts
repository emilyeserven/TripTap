import { useQuery } from "@tanstack/react-query";

import { bookmarksApi } from "../lib/api";

const BOOKMARKS_KEY = ["bookmarks"] as const;

/**
 * Read-only queries against the bookmarks proxy. These fail (502/503) when the endpoint is
 * unconfigured or the Tailnet host is unreachable; callers surface that as an inline error state.
 * Retries are disabled so an unreachable host fails fast instead of hanging the UI.
 */

/** The flat tag tree from the bookmarks app (used to pick a parent tag as a source). */
export function useBookmarksTags() {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "tags"],
    queryFn: bookmarksApi.tags,
    retry: false,
  });
}

/** The taxonomies from the bookmarks app (used to pick a taxonomy as a source). */
export function useBookmarksTaxonomies() {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "taxonomies"],
    queryFn: bookmarksApi.taxonomies,
    retry: false,
  });
}

/** The terms of one taxonomy. Deferred until a taxonomy id is provided. */
export function useBookmarksTerms(taxonomyId: string | null) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "terms", taxonomyId],
    queryFn: () => bookmarksApi.terms(taxonomyId as string),
    enabled: Boolean(taxonomyId),
    retry: false,
  });
}

/** The selectable vocabulary for the currently configured source (parent tag's children or terms). */
export function useBookmarksVocabulary() {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "vocabulary"],
    queryFn: bookmarksApi.vocabulary,
    retry: false,
  });
}
