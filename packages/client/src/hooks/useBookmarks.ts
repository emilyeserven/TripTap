import type { SentenceTermCategory, TagTermOption } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useBookmarksSettings } from "./useSettings";
import { bookmarksApi } from "../lib/api";

const BOOKMARKS_KEY = ["bookmarks"] as const;

/**
 * Shared options for every bookmarks query. Bookmark data lives in an external app that changes
 * independently of TripTap, so — unlike TripTap's own data — these must always revalidate rather than
 * sit on a cached snapshot:
 * - `staleTime: 0` marks the data stale immediately, so it refetches on every mount (navigating to a
 *   page shows current data).
 * - `refetchOnWindowFocus: true` refetches when the user returns to the tab, e.g. right after editing
 *   in the bookmarks app (this overrides the app-wide default of `false`).
 * Refetches run in the background while the previous data stays on screen, so there's no flicker;
 * `retry: false` keeps an unreachable (Tailnet-only) host from hanging the UI.
 */
const BOOKMARKS_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  retry: false as const,
};

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
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/** The taxonomies from the bookmarks app (used to pick a taxonomy as a source). */
export function useBookmarksTaxonomies() {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "taxonomies"],
    queryFn: bookmarksApi.taxonomies,
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/** The terms of one taxonomy. Deferred until a taxonomy id is provided. */
export function useBookmarksTerms(taxonomyId: string | null) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "terms", taxonomyId],
    queryFn: () => bookmarksApi.terms(taxonomyId as string),
    enabled: Boolean(taxonomyId),
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/**
 * The selectable vocabulary for one channel's configured source (parent tag's children or a
 * taxonomy's terms, optionally narrowed to a parent term).
 */
export function useBookmarksVocabulary(category: SentenceTermCategory = "vocabulary") {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "vocabulary", category],
    queryFn: () => bookmarksApi.vocabulary(category),
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/** The Grammar channel's vocabulary. */
export function useBookmarksGrammarVocabulary() {
  return useBookmarksVocabulary("grammar");
}

/** The full Grammar-source tag hierarchy, for picking a subtag from anywhere in the tree. */
export interface GrammarTagTree {
  /** All candidate nodes with `parentId` edges (the whole tag tree, or the taxonomy's terms). */
  nodes: TagTermOption[];
  /** The node whose children are the top level: the source tag id, or a taxonomy drill-down term. */
  rootId: string | null;
  /** Display name of the top-level section (the configured Grammar source's label). */
  rootLabel: string;
  isLoading: boolean;
  isError: boolean;
  /** False when no Grammar source is configured in Settings. */
  configured: boolean;
}

/**
 * The Grammar source's full tag tree so a picker can chain through subtags. A tag source uses the
 * flat tag tree (rooted at the source tag); a taxonomy source uses that taxonomy's terms (rooted at
 * the optional drilled-down term). Both hooks are always called to keep hook order stable; the
 * unused one is disabled.
 */
export function useGrammarTagTree(): GrammarTagTree {
  const settings = useBookmarksSettings();
  const source = settings.data?.grammarSource ?? null;
  const isTaxonomy = source?.kind === "taxonomy";

  const tags = useBookmarksTags();
  const terms = useBookmarksTerms(isTaxonomy ? source.id : null);

  if (!source) {
    return {
      nodes: [],
      rootId: null,
      rootLabel: "Grammar",
      isLoading: settings.isLoading,
      isError: false,
      configured: false,
    };
  }
  if (isTaxonomy) {
    return {
      nodes: terms.data ?? [],
      rootId: source.termId ?? null,
      rootLabel: source.termLabel ?? source.label,
      isLoading: terms.isLoading,
      isError: terms.isError,
      configured: true,
    };
  }
  return {
    nodes: tags.data ?? [],
    rootId: source.id,
    rootLabel: source.label,
    isLoading: tags.isLoading,
    isError: tags.isError,
    configured: true,
  };
}

/** All bookmarks across one channel's configured source. */
export function useBookmarkRecords(category: SentenceTermCategory) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "records", category],
    queryFn: () => bookmarksApi.records(category),
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/** The whole bookmarks collection (+ complexity-scale metadata) for the Collections browser. */
export function useBookmarkResources() {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "resources"],
    queryFn: () => bookmarksApi.resources(),
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/** The bookmarks carrying a specific tag id. Deferred until a tag id is provided. */
export function useBookmarksByTag(tagId: string | null) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "by-tag", tagId],
    queryFn: () => bookmarksApi.byTag(tagId as string),
    enabled: Boolean(tagId),
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/** The bookmark sections carrying a specific tag id. Deferred until a tag id is provided. */
export function useBookmarkSectionsByTag(tagId: string | null) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "sections-by-tag", tagId],
    queryFn: () => bookmarksApi.sectionsByTag(tagId as string),
    enabled: Boolean(tagId),
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/** A single bookmark (with its timestamp sections). Deferred until an id is provided. */
export function useBookmarkRecord(id: string | null) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "record", id],
    queryFn: () => bookmarksApi.record(id as string),
    enabled: Boolean(id),
    ...BOOKMARKS_QUERY_OPTIONS,
  });
}

/**
 * Create a new term in the bookmarks app under one channel's configured source. On success every
 * bookmarks query is invalidated so the new term appears in the relevant vocabulary picker.
 */
export function useCreateBookmarkTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string;
      category: SentenceTermCategory; }) =>
      bookmarksApi.createTerm(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: BOOKMARKS_KEY,
      });
    },
  });
}

/**
 * A manual "refresh from the bookmarks app" action: invalidates every bookmarks query so all mounted
 * ones refetch immediately. The queries already revalidate on mount and window focus (see
 * {@link BOOKMARKS_QUERY_OPTIONS}); this is the explicit escape hatch for when the bookmarks app was
 * edited in a still-visible window (so TripTap never lost focus) and the user wants the latest now.
 */
export function useRefreshBookmarks() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: BOOKMARKS_KEY,
    });
}
