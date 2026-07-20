/** Settings and external-proxy APIs: settings, bookmarks host, and dictionary lookup. */
import type {
  BookmarkRecord,
  BookmarkResource,
  BookmarkResourceList,
  BookmarkSectionMatch,
  BookmarksSettings,
  BookmarksTaxonomy,
  DictionaryEntry,
  DictionarySettings,
  ExampleSentence,
  LearnerProfile,
  StartSettings,
  UpdateLearnerProfileInput,
  UpdateStartSettingsInput,
  UpdateXpSettingsInput,
  XpSettings,
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
  getProfile: () => request<LearnerProfile>("/settings/profile"),
  getXp: () => request<XpSettings>("/settings/xp"),
  getStart: () => request<StartSettings>("/settings/start"),
  updateStart: (input: UpdateStartSettingsInput) =>
    request<StartSettings>("/settings/start", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  updateXp: (input: UpdateXpSettingsInput) =>
    request<XpSettings>("/settings/xp", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  updateProfile: (input: UpdateLearnerProfileInput) =>
    request<LearnerProfile>("/settings/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
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
  /** All bookmarks (with thumbnail + website) carrying a specific tag id (e.g. a grammar note's tag). */
  byTag: (tagId: string) => request<BookmarkResource[]>(`/bookmarks/by-tag/${encodeURIComponent(tagId)}`),
  /** Every bookmark section whose upstream tags include a specific tag id (e.g. a grammar note's tag). */
  sectionsByTag: (tagId: string) =>
    request<BookmarkSectionMatch[]>(`/bookmarks/sections-by-tag/${encodeURIComponent(tagId)}`),
  /** Every section of every bookmark — the Start Something suggestion pool. */
  sections: () => request<BookmarkSectionMatch[]>("/bookmarks/sections"),
  /** The whole bookmarks collection (+ complexity-scale metadata) for the Collections browser. */
  resources: () => request<BookmarkResourceList>("/bookmarks/resources"),
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
