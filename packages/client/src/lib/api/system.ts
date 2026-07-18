/** Settings and external-proxy APIs: settings, bookmarks host, and dictionary lookup. */
import type {
  BookmarkRecord,
  BookmarkResource,
  BookmarksSettings,
  BookmarksTaxonomy,
  DictionaryEntry,
  DictionarySettings,
  ExampleSentence,
  OcrSettings,
  RenshuuExampleSentence,
  RenshuuSettings,
  SentenceTermCategory,
  TagTermOption,
  UpdateBookmarksSettingsInput,
  UpdateDictionarySettingsInput,
  UpdateOcrSettingsInput,
  UpdateRenshuuSettingsInput,
  MediaStorageStatus,
  MediaConnectionTestResult,
} from "@sentence-bank/types";

import { request } from "./request";

export const settingsApi = {
  getOcr: () => request<OcrSettings>("/settings/ocr"),
  updateOcr: (input: UpdateOcrSettingsInput) =>
    request<OcrSettings>("/settings/ocr", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  getBookmarks: () => request<BookmarksSettings>("/settings/bookmarks"),
  updateBookmarks: (input: UpdateBookmarksSettingsInput) =>
    request<BookmarksSettings>("/settings/bookmarks", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  getDictionary: () => request<DictionarySettings>("/settings/dictionary"),
  updateDictionary: (input: UpdateDictionarySettingsInput) =>
    request<DictionarySettings>("/settings/dictionary", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  getRenshuu: () => request<RenshuuSettings>("/settings/renshuu"),
  updateRenshuu: (input: UpdateRenshuuSettingsInput) =>
    request<RenshuuSettings>("/settings/renshuu", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  getMedia: () => request<MediaStorageStatus>("/settings/media"),
  testMedia: () => request<MediaConnectionTestResult>("/settings/media/test", {
    method: "POST",
  }),
};

/** Read-only proxy to the external bookmarks tag/taxonomy API (all calls go server-side). */
export const bookmarksApi = {
  tags: () => request<TagTermOption[]>("/bookmarks/tags"),
  taxonomies: () => request<BookmarksTaxonomy[]>("/bookmarks/taxonomies"),
  terms: (taxonomyId: string) =>
    request<TagTermOption[]>(`/bookmarks/taxonomies/${taxonomyId}/terms`),
  vocabulary: (category?: SentenceTermCategory) =>
    request<TagTermOption[]>(`/bookmarks/vocabulary${category ? `?category=${category}` : ""}`),
  createTerm: (input: { name: string;
    category: SentenceTermCategory; }) =>
    request<TagTermOption>("/bookmarks/terms", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  /** All bookmarks across one channel's configured source (sections omitted). */
  records: (category: SentenceTermCategory) =>
    request<BookmarkRecord[]>(`/bookmarks/records?category=${category}`),
  /** A single bookmark with its flattened timestamp sections. */
  record: (id: string) => request<BookmarkRecord>(`/bookmarks/records/${encodeURIComponent(id)}`),
  /** All bookmarks carrying a specific tag id (e.g. a grammar note's Grammar Source tag). */
  byTag: (tagId: string) => request<BookmarkRecord[]>(`/bookmarks/by-tag/${encodeURIComponent(tagId)}`),
  /** The whole bookmarks collection with website + runtime, for the Find a Resource browser. */
  resources: () => request<BookmarkResource[]>("/bookmarks/resources"),
};

/** Proxy to the external Japanese dictionary lookup (all calls go server-side; provider is swappable). */
export const dictionaryApi = {
  search: (keyword: string) =>
    request<DictionaryEntry[]>(`/dictionary/search?keyword=${encodeURIComponent(keyword)}`),
};

/** Proxy to Tatoeba example-sentence search (server-side; CC-BY 2.0 FR — attribute Tatoeba). */
export const tatoebaApi = {
  search: (query: string, limit = 5) =>
    request<ExampleSentence[]>(
      `/tatoeba/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    ),
};

/** Proxy to Renshuu example-sentence search (server-side, using the learner's stored API key). */
export const renshuuApi = {
  search: (query: string, limit = 10) =>
    request<RenshuuExampleSentence[]>(
      `/renshuu/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    ),
};
