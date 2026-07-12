import type { SentenceTermCategory } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

/**
 * The selectable vocabulary for one channel's configured source (parent tag's children or a
 * taxonomy's terms, optionally narrowed to a parent term).
 */
export function useBookmarksVocabulary(category: SentenceTermCategory = "vocabulary") {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "vocabulary", category],
    queryFn: () => bookmarksApi.vocabulary(category),
    retry: false,
  });
}

/** The Grammar channel's vocabulary. */
export function useBookmarksGrammarVocabulary() {
  return useBookmarksVocabulary("grammar");
}

/** The General channel's vocabulary. */
export function useBookmarksGeneralVocabulary() {
  return useBookmarksVocabulary("general");
}

/** The Listening channel's vocabulary (the child tags used to filter listening bookmarks). */
export function useBookmarksListeningVocabulary() {
  return useBookmarksVocabulary("listening");
}

/** Bookmarks tagged with the given tag id. Deferred until a tag id is provided. */
export function useBookmarkRecords(tagId: string | null) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "records", tagId],
    queryFn: () => bookmarksApi.records(tagId as string),
    enabled: Boolean(tagId),
    retry: false,
  });
}

/** A single bookmark (with its timestamp sections). Deferred until an id is provided. */
export function useBookmarkRecord(id: string | null) {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "record", id],
    queryFn: () => bookmarksApi.record(id as string),
    enabled: Boolean(id),
    retry: false,
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
