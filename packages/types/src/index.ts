/**
 * Shared sentence-bank domain types.
 *
 * These are consumed by both the Fastify API (`@sentence-bank/middleware`) and the React client
 * (`@sentence-bank/client`) so the wire contract stays in one place.
 */

export * from "./answer-sheet.js";
export * from "./ai-lesson.js";
export * from "./dictionary.js";
export * from "./drill-session.js";
export * from "./grammar-note.js";
export * from "./lesson.js";
export * from "./listening-session.js";
export * from "./migaku-import.js";
export * from "./my-sentence.js";
export * from "./tutor.js";
export * from "./practice-sentence.js";
export * from "./question-sheet.js";
export * from "./reading-session.js";
export * from "./sentence-mark.js";
export * from "./shadowing-session.js";
export * from "./renshuu.js";
export * from "./tatoeba.js";
export * from "./writing.js";
export * from "./writing-prompt.js";

/** A reusable origin for sentences (a book, show, article, …) — the "source taxonomy". */
export interface Source {
  id: string;
  /** Display name, e.g. "よつばと！ vol. 1". */
  name: string;
  /** Free-text kind, e.g. "book", "show", "article". */
  type: string | null;
  author: string | null;
  url: string | null;
  notes: string | null;
  /** ISO-8601 timestamp of when the source was added. */
  createdAt: string;
}

/** Payload for creating a source. */
export interface CreateSourceInput {
  name: string;
  type?: string | null;
  author?: string | null;
  url?: string | null;
  notes?: string | null;
}

/** Payload for partially updating a source. */
export type UpdateSourceInput = Partial<CreateSourceInput>;

/**
 * One segment of a furigana-annotated sentence: a base run of text and, for kanji runs, the reading
 * to show as ruby (`r` is null for kana/latin/punctuation that needs no reading).
 */
export interface FuriToken {
  t: string;
  r: string | null;
}

/** A single example sentence stored in the bank. */
export interface Sentence {
  id: string;
  /** The sentence in the target language, e.g. "毎朝コーヒーを飲みます。". */
  text: string;
  /**
   * Furigana segmentation of {@link text}, auto-generated server-side; null until generated (or for
   * non-Japanese text). Rendered as ruby when the furigana toggle is on.
   */
  reading: FuriToken[] | null;
  /** Message from the last failed furigana generation, or null when it succeeded. */
  readingError: string | null;
  /** The meaning in the user's own language; null when mined text-only and not yet translated. */
  translation: string | null;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** Legacy free-text origin, kept for rows predating the source taxonomy. */
  source: string | null;
  /** The taxonomy source this sentence belongs to, or null. */
  sourceId: string | null;
  /** Per-sentence location within the source, e.g. "42", "p. 12–13". */
  page: string | null;
  /** Optional free-form notes. */
  notes: string | null;
  /** Optional comma-separated tags. */
  tags: string | null;
  /**
   * Structured tags borrowed from the external bookmarks taxonomy (distinct from free-text {@link
   * tags}). Denormalized (id + name + provenance) so display never needs a live bookmarks call. Null
   * when none are attached.
   */
  terms: SentenceTermRef[] | null;
  /** The capture this sentence was mined from, or null. */
  captureId: string | null;
  /** True when an audio clip is stored for this sentence (fetch from `/api/sentences/:id/audio`). */
  hasAudio: boolean;
  /** True when an image is stored for this sentence (fetch from `/api/sentences/:id/image`). */
  hasImage: boolean;
  /** How many vocab items are linked to this sentence (drives the "Break it down" affordance). */
  vocabCount: number;
  /** ISO-8601 timestamp of when the sentence was added. */
  createdAt: string;
}

/** Payload for creating a sentence. */
export interface CreateSentenceInput {
  text: string;
  translation?: string | null;
  language: string;
  source?: string | null;
  sourceId?: string | null;
  page?: string | null;
  notes?: string | null;
  tags?: string | null;
  /** Structured taxonomy terms borrowed from the bookmarks app; see {@link SentenceTermRef}. */
  terms?: SentenceTermRef[] | null;
  captureId?: string | null;
  /** Vocab items to link to this sentence (many-to-many). */
  vocabIds?: string[];
}

/** A standalone vocabulary entry (peer of {@link Sentence}). */
export interface Vocab {
  id: string;
  /** The word/term, e.g. "毎朝". */
  term: string;
  /** Reading/pronunciation, e.g. "まいあさ". */
  reading: string | null;
  /** Meaning in the user's language; null when not yet defined. */
  meaning: string | null;
  language: string;
  sourceId: string | null;
  page: string | null;
  tags: string | null;
  notes: string | null;
  /** The capture this vocab was mined from, or null. */
  captureId: string | null;
  /** True when an audio clip is stored for this vocab item (fetch from `/api/vocab/:id/audio`). */
  hasAudio: boolean;
  /** True when an image is stored for this vocab item (fetch from `/api/vocab/:id/image`). */
  hasImage: boolean;
  createdAt: string;
}

/** Payload for creating a vocab item. */
export interface CreateVocabInput {
  term: string;
  reading?: string | null;
  meaning?: string | null;
  language: string;
  sourceId?: string | null;
  page?: string | null;
  tags?: string | null;
  notes?: string | null;
  captureId?: string | null;
}

/** Payload for partially updating a vocab item. */
export type UpdateVocabInput = Partial<CreateVocabInput>;

/** How a saved parse template delimits items. */
export type ParseBoundary = "fixed" | "blank";

/** Which type a parse template produces. */
export type ParseTarget = "sentence" | "vocab";

/** A saved capture-parsing template. */
export interface ParseTemplate {
  id: string;
  name: string;
  target: ParseTarget;
  body: string;
  boundary: ParseBoundary;
  ignoreBlankLines: boolean;
  createdAt: string;
}

/** Payload for creating a parse template. */
export interface CreateParseTemplateInput {
  name: string;
  target: ParseTarget;
  body: string;
  boundary: ParseBoundary;
  ignoreBlankLines: boolean;
}

/** Payload for partially updating a sentence. `reading` is a manual furigana override (null clears it). */
export type UpdateSentenceInput = Partial<CreateSentenceInput> & {
  reading?: FuriToken[] | null;
};

/** Standard error shape returned by the API. */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

/** A single block of text recognized from an image by the OCR service. */
export interface OcrBlock {
  /** The recognized text for this block. */
  text: string;
  /** Bounding box as four [x, y] points (top-left, top-right, bottom-right, bottom-left). */
  bbox: [number, number][];
  /** Recognition confidence in [0, 1]. */
  confidence: number;
  /** Detected script for the block, e.g. "ja" or "en". */
  lang: string;
  /** Which engine produced the final text ("paddleocr" or "manga-ocr"). */
  engine: string;
}

/** Result returned by the OCR service for one image. */
export interface OcrResult {
  /** Per-block recognition results, ordered top-to-bottom. */
  blocks: OcrBlock[];
  /** All blocks joined into a single string for convenience. */
  fullText: string;
}

/**
 * Role a cleaned line plays within its group when deriving bank items. `structure` (page furniture)
 * and `ignore` (generic exclusion) are both left out of the derived sentence/vocab.
 */
export type CleanedLineRole = "text" | "furigana" | "translation" | "structure" | "ignore";

/** What kind of bank item a group of cleaned lines produces. */
export type CleanedGroupKind = "sentence" | "vocab";

/** One editable line in the Cleaned Blocks workbench, seeded from an OCR block. */
export interface CleanedLine {
  /** Stable id, referenced by nothing but kept for React keys and reorder tracking. */
  id: string;
  /** Editable text; OCR fixes are applied here. */
  text: string;
  /** Language code for this line, e.g. "ja", "en". */
  lang: string;
  role: CleanedLineRole;
  /** Id of the {@link CleanedGroup} this line belongs to (always assigned). */
  group: string;
}

/**
 * A stitch: a run of continuation lines that concatenate into one text unit. Stitches sharing a
 * {@link CleanedGroup.link} are combined into one derived bank item (e.g. a text stitch linked to its
 * translation stitch → one sentence with both fields).
 */
export interface CleanedGroup {
  /** Stable id (referenced by {@link CleanedLine.group}). */
  id: string;
  kind: CleanedGroupKind;
  /** Stitches sharing a link derive as one item (text + translation); null = standalone. */
  link: string | null;
}

/**
 * Persisted, structured cleanup of a capture's OCR blocks. Lets the user fix text, group
 * continuation/translation/furigana lines together, and bulk-ignore whole languages, then derive
 * sentences and vocab from the result. Null until first saved.
 */
export interface CleanedBlocks {
  lines: CleanedLine[];
  groups: CleanedGroup[];
  /** Language codes to exclude from derivation entirely, e.g. ["zh"]. */
  ignoredLangs: string[];
}

/** Workflow state of a capture: freshly scanned, or already mined into sentences. */
export type CaptureStatus = "new" | "parsed";

/** Fields shared by the capture list summary and the full detail. */
export interface CaptureSummary {
  id: string;
  /** Optional user-given label; falls back to a text preview in the UI. */
  title: string | null;
  /** The full extracted text (joined OCR output). Preserved untouched as the source of truth. */
  text: string;
  /** Optional user-edited, tidied-up copy of {@link text}; null when no cleaned copy exists yet. */
  cleanedText: string | null;
  /** OCR engines that contributed to this capture, e.g. ["paddleocr", "manga-ocr"]. */
  engines: string[];
  /** The taxonomy source this capture came from, or null. */
  sourceId: string | null;
  /** Location within the source, e.g. "42", "p. 12–13". */
  page: string | null;
  notes: string | null;
  status: CaptureStatus;
  /** Whether an original image is stored (served from `/api/captures/:id/image`). */
  hasImage: boolean;
  imageWidth: number | null;
  imageHeight: number | null;
  /** ISO-8601 timestamp of when the capture was saved. */
  createdAt: string;
}

/** A saved OCR capture, including the per-block detail (detail view only). */
export interface Capture extends CaptureSummary {
  /** Per-block OCR detail, preserved for later parsing into sentences. */
  blocks: OcrBlock[];
  /** Structured, editable cleanup of the OCR blocks; null until first saved. */
  cleanedBlocks: CleanedBlocks | null;
  imageMime: string | null;
}

/**
 * JSON payload accompanying a capture upload. Sent as the `payload` field of a
 * `multipart/form-data` request whose `file` field carries the (optional) image.
 */
export interface CreateCaptureInput {
  title?: string | null;
  text: string;
  blocks: OcrBlock[];
  engines: string[];
  sourceId?: string | null;
  page?: string | null;
  notes?: string | null;
}

/** Masked state of a single stored secret. The secret itself is never sent to the client. */
export interface SecretState {
  /** Whether a value is currently stored. */
  configured: boolean;
  /** Last few characters of the stored value, for recognition (e.g. "1234"), or null when unset. */
  hint: string | null;
}

/**
 * Masked view of the cloud OCR credentials, as returned by `GET /api/settings/ocr`. Secrets are
 * stored server-side (DB, overriding env); only their presence and a short hint are exposed.
 */
export interface OcrSettings {
  ocrSpace: SecretState;
  googleVision: SecretState;
}

/**
 * Payload for `PATCH /api/settings/ocr`. Each field is tri-state: `undefined`/omitted leaves the
 * stored value unchanged, an empty string or `null` clears it, any other string replaces it.
 */
export interface UpdateOcrSettingsInput {
  ocrSpaceApiKey?: string | null;
  googleVisionApiKey?: string | null;
}

/**
 * Masked view of the Renshuu API key, as returned by `GET /api/settings/renshuu`. The key is stored
 * server-side (DB, overriding the `RENSHUU_API_KEY` env var); only its presence and a short hint are
 * exposed. Backs the Renshuu example-sentence lookup.
 */
export interface RenshuuSettings {
  apiKey: SecretState;
}

/**
 * Payload for `PATCH /api/settings/renshuu`. The `apiKey` field is tri-state: `undefined`/omitted
 * leaves the stored value unchanged, an empty string or `null` clears it, any other string replaces it.
 */
export interface UpdateRenshuuSettingsInput {
  apiKey?: string | null;
}

/* ── Bookmarks tag/taxonomy integration ────────────────────────────────────────────────────────
 * A borrowed vocabulary from the external "eeSimple Bookmarks" app. The user configures an endpoint
 * plus one source per channel — either a parent tag (whose children become the vocabulary) or a
 * taxonomy (whose terms become the vocabulary) — then tags sentences with terms drawn from it.
 * There are five independent channels ({@link SentenceTermCategory}): Vocabulary, Grammar, a
 * catch-all General channel (e.g. politeness level, situational context), Textbooks &
 * Worksheets (the `resource` channel, for tagging by source material), and Listening (the
 * `listening` channel, for associating Listen-and-Shadow sessions with a source). A taxonomy source may
 * optionally drill into a parent term, so only that term's children become the vocabulary. All calls
 * to the bookmarks host go server-side through the middleware proxy.
 */

/** Which of the bookmarks app's two vocabulary systems a source refers to. */
export type BookmarksSourceKind = "tag" | "taxonomy";

/**
 * Which tagging channel a term belongs to. Each channel has its own configured {@link BookmarksSource}
 * and its own sentence-form picker. Older stored terms predate this field — default them to
 * `"vocabulary"` when absent.
 */
export type SentenceTermCategory = "vocabulary" | "grammar" | "general" | "resource";

/** The configured vocabulary source: a chosen parent tag or taxonomy in the bookmarks app. */
export interface BookmarksSource {
  kind: BookmarksSourceKind;
  /** The parent tag id (kind "tag") or the taxonomy id (kind "taxonomy"). */
  id: string;
  /** Display name captured at selection time, e.g. the tag/taxonomy name. */
  label: string;
  /**
   * Optional parent-term drill-down (kind "taxonomy" only): when set, only this term's direct
   * children form the vocabulary, and newly created terms are nested under it. Empty = whole taxonomy.
   */
  termId?: string | null;
  /** Display name of the parent term captured at selection time. */
  termLabel?: string | null;
}

/**
 * Bookmarks integration settings as returned by `GET /api/settings/bookmarks`. Unlike
 * {@link OcrSettings} these are not secrets, so raw values are returned.
 */
export interface BookmarksSettings {
  /** Base URL of the bookmarks API, or null to fall back to the env/default. */
  endpointUrl: string | null;
  /** The selected Vocabulary source, or null when unconfigured. */
  source: BookmarksSource | null;
  /** The selected Grammar source, or null when unconfigured. */
  grammarSource: BookmarksSource | null;
  /** The selected General source, or null when unconfigured. */
  generalSource: BookmarksSource | null;
  /** The selected Textbooks & Worksheets / Resources source, or null when unconfigured. */
  resourceSource: BookmarksSource | null;
}

/**
 * Payload for `PATCH /api/settings/bookmarks`. Tri-state per field like {@link UpdateOcrSettingsInput}:
 * `undefined`/omitted leaves the value unchanged, `null`/empty clears it, any other value replaces it.
 */
export interface UpdateBookmarksSettingsInput {
  endpointUrl?: string | null;
  source?: BookmarksSource | null;
  grammarSource?: BookmarksSource | null;
  generalSource?: BookmarksSource | null;
  resourceSource?: BookmarksSource | null;
}

/**
 * A normalized, selectable option from the bookmarks vocabulary — one child tag or one taxonomy term.
 * `parentId` carries the upstream hierarchy (nullable adjacency). Extra upstream fields are dropped.
 */
export interface TagTermOption {
  id: string;
  name: string;
  parentId: string | null;
  slug?: string | null;
  description?: string | null;
}

/** A taxonomy in the bookmarks app, offered as a source option in Settings. */
export interface BookmarksTaxonomy {
  id: string;
  name: string;
  slug: string;
  /** Whether terms nest via parentId. */
  hierarchical: boolean;
  /** Whether an owner may hold at most one term from this taxonomy. */
  singleValue: boolean;
  icon: string | null;
  termCount: number;
}

/** One borrowed tag/term stored on a sentence, with provenance so the UI can group and re-open it. */
export interface SentenceTermRef {
  id: string;
  name: string;
  kind: BookmarksSourceKind;
  /** The source tag/taxonomy id this term was drawn from. */
  sourceId: string;
  /** The source tag/taxonomy display name at the time of tagging. */
  sourceLabel: string;
  /** Which channel this term belongs to. Absent on rows created before channels existed → treat as "vocabulary". */
  category: SentenceTermCategory;
}

/**
 * One timestamped "section" borrowed from a bookmark's Sections custom property, flattened from the
 * upstream (possibly nested) structure. Only entries with `type === "timestamp"` are surfaced; the
 * `startValue`/`endValue` are the upstream raw strings (parsed to milliseconds on the client).
 */
export interface BookmarkSection {
  id: string;
  /** Display label (the upstream section `name`); null when unnamed. */
  label: string | null;
  /** Raw upstream start value, e.g. "00:01:23.400" or "83" (seconds). */
  startValue: string;
  /** Raw upstream end value. */
  endValue: string;
}

/** What a bookmark section entry represents upstream (mirrors the host's `SectionEntry.type`). */
export type BookmarkSectionType = "name" | "url" | "page" | "timestamp";

/**
 * One node of a bookmark's Sections tree, flattened to an adjacency list (`parentId`) so a chained
 * combobox can drill it directly. Unlike {@link BookmarkSection}, every entry type is kept (name/page/
 * url/timestamp) and the hierarchy is preserved. `startValue`/`endValue` are the raw upstream strings
 * (a page number, a `HH:MM:SS` timestamp, …); empty upstream values become null.
 */
export interface BookmarkSectionNode {
  id: string;
  name: string;
  /** Parent section id; null for a top-level section. */
  parentId: string | null;
  type: BookmarkSectionType;
  startValue: string | null;
  endValue: string | null;
  /** An entry's own link, independent of type; null when none. */
  url: string | null;
  /** Tag ids associated with this section upstream (may be empty). */
  tagIds: string[];
}

/**
 * A denormalized reference to one specific section of a bookmark, stored alongside a bookmark id on the
 * content that points at it (question sheets, listening/shadowing sessions, grammar-note resources) so
 * the section can be displayed without re-fetching. `label` is the breadcrumb path (e.g. "Ch. 3 › Lesson
 * 2"); `startValue`/`endValue` carry the position so a `timestamp` section can seed a segment / player.
 */
export interface BookmarkSectionRef {
  id: string;
  label: string;
  type: BookmarkSectionType;
  startValue: string | null;
  endValue: string | null;
  /**
   * The section's own name (not the breadcrumb) and its parent id in the bookmark's Sections tree.
   * Populated only on tag-match results ({@link BookmarkSectionMatch}) so a grammar note can nest
   * sub-items under their parent; absent (undefined) on stored references made by the section picker.
   */
  name?: string;
  parentId?: string | null;
}

/**
 * One bookmark section whose upstream `tagIds` include a given tag, with enough of its owning bookmark
 * to link to. Returned by `GET /api/bookmarks/sections-by-tag/:tagId` — how a grammar note auto-gathers
 * the specific sections (not just whole bookmarks) tagged with its Grammar Source tag.
 */
export interface BookmarkSectionMatch {
  bookmarkId: string;
  bookmarkTitle: string;
  bookmarkUrl: string | null;
  /** The bookmark's thumbnail (same-origin proxy URL), resolved like its cover image; null when none. */
  imageUrl: string | null;
  section: BookmarkSectionRef;
}

/**
 * A bookmark record fetched from the external bookmarks app. Only the fields we consume are surfaced;
 * `sections` and `sectionTree` are populated only by the single-record fetch
 * (`GET /api/bookmarks/records/:id`).
 */
export interface BookmarkRecord {
  id: string;
  title: string;
  /** The primary link (the video URL for Listen-and-Shadow); null when the bookmark has none. */
  url: string | null;
  /** Flattened timestamp sections; empty on the list endpoint, populated on the single-record fetch. */
  sections: BookmarkSection[];
  /** The full Sections tree (all entry types, hierarchical); empty on the list endpoint. */
  sectionTree: BookmarkSectionNode[];
}

/**
 * A bookmark's complexity level, read from the upstream "Complexity Scale" rating property and
 * normalized to a band. A single-value bookmark has `min === max`; a range-valued one spans them.
 */
export interface BookmarkComplexity {
  /** Lower bound of the level (0-based). */
  min: number;
  /** Upper bound of the level (equals `min` unless the bookmark holds a range). */
  max: number;
}

/**
 * The "Complexity Scale" rating property's shape, so the client can render the level filter and label
 * a resource's complexity. Resolved once per request from the bookmarks host's custom-property list.
 */
export interface ComplexityScale {
  /** Highest level on the scale (e.g. 5). The scale is assumed to start at 0. */
  max: number;
  /** Per-level labels keyed by the numeric level as a string, e.g. `{ "0": "Absolute Beginner" }`. */
  labels: Record<string, string>;
}

/**
 * A bookmark surfaced for the Collections browser — the whole bookmarks collection with the extra
 * fields that page sorts/filters by: the runtime (from the upstream "Runtime" custom property, in
 * seconds), the media type, the complexity level, and the website it lives on. Distinct from
 * {@link BookmarkRecord}, which is the narrow per-channel shape used by the term pickers.
 */
export interface BookmarkResource {
  id: string;
  title: string;
  /** The bookmark's primary link; null when it has none. */
  url: string | null;
  /** The website the bookmark belongs to (for the website filter); null when unknown. */
  website: { domain: string;
    siteName: string; } | null;
  /** Runtime in seconds (from the upstream "Runtime" duration property); null when not set. */
  runtimeSeconds: number | null;
  /** The upstream media type name (e.g. "Video", "Book", "Article"); null when unknown. */
  mediaType: string | null;
  /** The bookmark's complexity band (from the "Complexity Scale" property); null when unset. */
  complexity: BookmarkComplexity | null;
  /**
   * The bookmark's thumbnail image URL — a same-origin `/api/bookmarks/{id}/images/{imageId}` path
   * (from the upstream `image.url`) that the middleware proxies to the bookmarks host; null when none.
   */
  imageUrl: string | null;
}

/**
 * Response of `GET /api/bookmarks/resources`: the whole Collections list plus the complexity-scale
 * metadata the client needs to build the level filter. `complexityScale` is null when the bookmarks
 * host has no "Complexity Scale" property.
 */
export interface BookmarkResourceList {
  resources: BookmarkResource[];
  complexityScale: ComplexityScale | null;
}
