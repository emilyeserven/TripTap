import type {
  AnswerSheetEntry,
  CleanedBlocks,
  DrillMistake,
  DrillMistakeReasonRef,
  DrillReason,
  DrillSubcategory,
  FuriToken,
  GrammarExample,
  LessonListeningNote,
  LessonWordNote,
  ListeningEntry,
  OcrBlock,
  PracticeGrammar,
  PracticePasses,
  PracticeWord,
  QuestionSheetGrid,
  QuestionSheetQuestion,
  ReadingLine,
  SentenceTermRef,
  ShadowingSegment,
  SourceGrammar,
  SourceVocab,
  WordNote,
  WritingCorrection,
} from "@sentence-bank/types";
import { type AnyPgColumn, boolean, customType, date, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Postgres `bytea` column mapped to a Node {@link Buffer}. */
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/**
 * `sources` — a reusable taxonomy of where sentences come from (a book, show, article, …). Sentences
 * reference a source via `sentences.source_id`; the per-sentence location (page number, chapter) lives
 * on the sentence, not here, since one source spans many sentences.
 */
export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Free-text kind, e.g. "book", "show", "article", "podcast". */
  type: text("type"),
  author: text("author"),
  url: text("url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type SourceRow = typeof sources.$inferSelect;
export type NewSourceRow = typeof sources.$inferInsert;

/** `sentences` table — one row per stored example sentence. */
export const sentences = pgTable("sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  // Nullable: a sentence can be mined text-only and translated later.
  translation: text("translation"),
  // Auto-generated furigana segmentation of `text` (ruby readings). Null until generated / for
  // non-Japanese text.
  reading: jsonb("reading").$type<FuriToken[]>(),
  // Error message from the last failed furigana generation, so the user knows it didn't run.
  readingError: text("reading_error"),
  language: text("language").notNull(),
  // Legacy free-text origin, kept for rows created before the `sources` taxonomy existed. New
  // sentences should reference `sourceId` instead; `source` remains a fallback label.
  source: text("source"),
  sourceId: uuid("source_id").references(() => sources.id, {
    onDelete: "set null",
  }),
  // Per-sentence location within the source, e.g. "42", "p. 12–13", "ch. 3". Free-text on purpose.
  page: text("page"),
  notes: text("notes"),
  tags: text("tags"),
  // Structured taxonomy tags borrowed from the external bookmarks app (distinct from free-text
  // `tags`). Denormalized so display never needs a live bookmarks call. Null until any are attached.
  terms: jsonb("terms").$type<SentenceTermRef[]>(),
  // The capture this was mined from, for traceability. Nulled (not deleted) if the capture is removed.
  captureId: uuid("capture_id").references((): AnyPgColumn => captures.id, {
    onDelete: "set null",
  }),
  // Manual ordering within a capture's created items. Null until the user reorders; rows then sort by
  // this ascending (nulls last, i.e. never-ordered/new sentences trail) with createdAt as tiebreaker.
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type SentenceRow = typeof sentences.$inferSelect;
export type NewSentenceRow = typeof sentences.$inferInsert;

/** `vocab` — standalone vocabulary bank (peer of `sentences`, distinct from AI-Lesson-scoped vocab). */
export const vocab = pgTable("vocab", {
  id: uuid("id").primaryKey().defaultRandom(),
  term: text("term").notNull(),
  reading: text("reading"),
  meaning: text("meaning"),
  language: text("language").notNull(),
  sourceId: uuid("source_id").references(() => sources.id, {
    onDelete: "set null",
  }),
  page: text("page"),
  tags: text("tags"),
  notes: text("notes"),
  // The capture this was mined from, for traceability. Nulled (not deleted) if the capture is removed.
  captureId: uuid("capture_id").references((): AnyPgColumn => captures.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type VocabRow = typeof vocab.$inferSelect;
export type NewVocabRow = typeof vocab.$inferInsert;

/** `sentence_vocab` — many-to-many link: a sentence teaches vocab; a word has example sentences. */
export const sentenceVocab = pgTable(
  "sentence_vocab",
  {
    sentenceId: uuid("sentence_id")
      .notNull()
      .references(() => sentences.id, {
        onDelete: "cascade",
      }),
    vocabId: uuid("vocab_id")
      .notNull()
      .references(() => vocab.id, {
        onDelete: "cascade",
      }),
  },
  t => [primaryKey({
    columns: [t.sentenceId, t.vocabId],
  })],
);

export type SentenceVocabRow = typeof sentenceVocab.$inferSelect;

/**
 * `practice_sentences` — richly-annotated study cards (the genericized sentence-mining worksheet).
 * Distinct from `sentences`: typically imported from a capture or an existing sentence (both linked
 * for provenance), and *not* professionally written — every row starts flagged `needs_correction`,
 * with a nullable `correction` stored for a later display feature. Intra-card lists (word/grammar
 * breakdowns, study passes) live inline as JSONB; they are never queried independently.
 */
export const practiceSentences = pgTable("practice_sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  // Free-text reading of the tricky parts (worksheet-style), not generated furigana. Null if none.
  reading: text("reading"),
  translation: text("translation"),
  language: text("language").notNull(),
  // The single thing this sentence teaches (the "one target") and what kind it is. Free-text on
  // purpose; `target_kind` is constrained to a set at the route layer, not the DB.
  target: text("target"),
  targetKind: text("target_kind"),
  // How well the learner understands the sentence (Tofugu curation gate): "ready" | "studying" | "skip".
  // Free-text on purpose; the allowed set is validated at the route layer, not the DB. Null until assessed.
  comprehension: text("comprehension"),
  // The learner's pre-lookup guess at the meaning.
  guess: text("guess"),
  // Literal/structural gloss, recorded only when the structure surprised the learner.
  literal: text("literal"),
  // Politeness/register label, free-text (e.g. "casual (タメ口)").
  register: text("register"),
  nuance: text("nuance"),
  // Study breakdowns, embedded (never queried on their own). Null until the learner adds any.
  words: jsonb("words").$type<PracticeWord[]>(),
  grammar: jsonb("grammar").$type<PracticeGrammar[]>(),
  passes: jsonb("passes").$type<PracticePasses>(),
  // Structured tags from the bookmarks channels (Vocabulary / Grammar / General). Denormalized so
  // display never needs a live bookmarks call. Null until any are attached.
  terms: jsonb("terms").$type<SentenceTermRef[]>(),
  // Provenance. `source_id` is copied from the origin for filtering; the capture/sentence this was
  // imported from are nulled (not deleted) if that origin is removed.
  sourceId: uuid("source_id").references(() => sources.id, {
    onDelete: "set null",
  }),
  page: text("page"),
  captureId: uuid("capture_id").references((): AnyPgColumn => captures.id, {
    onDelete: "set null",
  }),
  sentenceId: uuid("sentence_id").references(() => sentences.id, {
    onDelete: "set null",
  }),
  // These sentences are not professionally written; every row starts as "needs review". The corrected
  // text is stored here but not yet surfaced in the UI (a deliberate follow-up feature).
  needsCorrection: boolean("needs_correction").notNull().default(true),
  correction: text("correction"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type PracticeSentenceRow = typeof practiceSentences.$inferSelect;
export type NewPracticeSentenceRow = typeof practiceSentences.$inferInsert;

/**
 * `practice_sentence_vocab` — many-to-many link between a practice sentence and the bank vocab created
 * for it (e.g. the words the learner couldn't read aloud). Parallel to `sentence_vocab`, but bound to
 * `practice_sentences` instead of `sentences`.
 */
export const practiceSentenceVocab = pgTable(
  "practice_sentence_vocab",
  {
    practiceSentenceId: uuid("practice_sentence_id")
      .notNull()
      .references(() => practiceSentences.id, {
        onDelete: "cascade",
      }),
    vocabId: uuid("vocab_id")
      .notNull()
      .references(() => vocab.id, {
        onDelete: "cascade",
      }),
  },
  t => [primaryKey({
    columns: [t.practiceSentenceId, t.vocabId],
  })],
);

export type PracticeSentenceVocabRow = typeof practiceSentenceVocab.$inferSelect;

/**
 * `my_sentences` — sentences the learner produced themselves (the "Output" step of the practice
 * worksheet). Not professionally written: every row starts flagged `needs_correction`, with a nullable
 * `correction` filled in later. Links back to the practice sentence it was produced from.
 */
export const mySentences = pgTable("my_sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  // What the learner meant to say (the intended meaning).
  translation: text("translation"),
  language: text("language").notNull(),
  practiceSentenceId: uuid("practice_sentence_id").references((): AnyPgColumn => practiceSentences.id, {
    onDelete: "set null",
  }),
  /** The writing this sentence was promoted from (via a correction), or null. */
  writingId: uuid("writing_id").references((): AnyPgColumn => writings.id, {
    onDelete: "set null",
  }),
  /** The tutoring lesson this sentence was added from, or null. */
  lessonId: uuid("lesson_id").references((): AnyPgColumn => lessons.id, {
    onDelete: "set null",
  }),
  needsCorrection: boolean("needs_correction").notNull().default(true),
  correction: text("correction"),
  // What the sentence, as written, actually says — the mismatch with `translation`.
  actualMeaning: text("actual_meaning"),
  // A prose note explaining the correction (e.g. from a tutoring lesson).
  explanation: text("explanation"),
  // Structured tags from the bookmarks channels (Vocabulary / Grammar / General). Denormalized so
  // display never needs a live bookmarks call. Null until any are attached.
  terms: jsonb("terms").$type<SentenceTermRef[]>(),
  // Why it was wrong — references into the shared Drill reason taxonomy. Null until any are tagged.
  reasons: jsonb("reasons").$type<DrillMistakeReasonRef[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type MySentenceRow = typeof mySentences.$inferSelect;
export type NewMySentenceRow = typeof mySentences.$inferInsert;

/**
 * `writings` — free-form blocks the learner wrote themselves (a paragraph, a journal entry, several
 * sentences). Carries the intended `meaning` and `comments`, the vocab/grammar/general `terms` they
 * were targeting, a `ready_to_review` flag, and inline `corrections`. Each correction can be
 * "officially added" to My Sentences (see `my_sentences.writing_id`).
 */
export const writings = pgTable("writings", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  /** What the learner intended to say; null if none. */
  meaning: text("meaning"),
  /** Additional comments/notes; null if none. */
  comments: text("comments"),
  language: text("language").notNull(),
  readyToReview: boolean("ready_to_review").notNull().default(false),
  terms: jsonb("terms").$type<SentenceTermRef[]>(),
  corrections: jsonb("corrections").$type<WritingCorrection[]>(),
  /** Snapshot of the writing prompt this entry was started from; null if freeform. */
  promptTitle: text("prompt_title"),
  promptText: text("prompt_text"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type WritingRow = typeof writings.$inferSelect;
export type NewWritingRow = typeof writings.$inferInsert;

/**
 * `question_sheets` — reusable templates of textbook/worksheet questions with no answer key. A
 * `layout` of "list" uses the `questions` JSONB (each question, and each of its parts, is an
 * answerable slot); "grid" uses the `grid` JSONB (each row×column cell is a slot). `bookmark_id`
 * links the sheet to a specific bookmark from the Textbooks & Worksheets bookmarks channel;
 * `due_date` optionally surfaces the sheet on the homepage when it's coming up or overdue.
 */
export const questionSheets = pgTable("question_sheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  notes: text("notes"),
  page: text("page"),
  bookmarkId: text("bookmark_id"),
  bookmarkTitle: text("bookmark_title"),
  bookmarkUrl: text("bookmark_url"),
  dueDate: timestamp("due_date", {
    withTimezone: true,
  }),
  layout: text("layout").notNull().default("list"),
  questions: jsonb("questions").$type<QuestionSheetQuestion[]>(),
  grid: jsonb("grid").$type<QuestionSheetGrid>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type QuestionSheetRow = typeof questionSheets.$inferSelect;
export type NewQuestionSheetRow = typeof questionSheets.$inferInsert;

/**
 * `answer_sheets` — one filled-in attempt at a {@link questionSheets question sheet}. Many answer
 * sheets may reference the same question sheet (the "reusable" part), so `question_sheet_id` carries
 * no uniqueness constraint; it uses `onDelete: "restrict"` so a question sheet can't be deleted while
 * answers exist. `entries` stores one record per answered slot, including inline correction fields.
 */
export const answerSheets = pgTable("answer_sheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionSheetId: uuid("question_sheet_id").notNull().references((): AnyPgColumn => questionSheets.id, {
    onDelete: "restrict",
  }),
  title: text("title"),
  entries: jsonb("entries").$type<AnswerSheetEntry[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type AnswerSheetRow = typeof answerSheets.$inferSelect;
export type NewAnswerSheetRow = typeof answerSheets.$inferInsert;

/**
 * `listening_sessions` — a "Listen and Shadow" session: a YouTube video (usually one of the learner's
 * bookmarks) plus a running log of timestamped `entries` typed while it plays. The associated bookmark
 * is denormalized (id/title/url) so the view can render and deep-link without a live bookmarks call.
 */
export const listeningSessions = pgTable("listening_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  videoUrl: text("video_url"),
  language: text("language").notNull(),
  bookmarkId: text("bookmark_id"),
  bookmarkTitle: text("bookmark_title"),
  bookmarkUrl: text("bookmark_url"),
  entries: jsonb("entries").$type<ListeningEntry[]>(),
  terms: jsonb("terms").$type<SentenceTermRef[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type ListeningSessionRow = typeof listeningSessions.$inferSelect;
export type NewListeningSessionRow = typeof listeningSessions.$inferInsert;

/**
 * `shadowing_sessions` — a shadowing practice session: a YouTube video plus a list of `segments` that
 * the player loops automatically (`default_max_replays` times, with a `default_gap_ms` silent gap,
 * each segment optionally overriding those). Also carries the same timestamped `entries` as a
 * listening session. The associated bookmark is denormalized like `listening_sessions`.
 */
export const shadowingSessions = pgTable("shadowing_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  videoUrl: text("video_url"),
  language: text("language").notNull(),
  bookmarkId: text("bookmark_id"),
  bookmarkTitle: text("bookmark_title"),
  bookmarkUrl: text("bookmark_url"),
  defaultMaxReplays: integer("default_max_replays").notNull().default(3),
  defaultGapMs: integer("default_gap_ms").notNull().default(0),
  segments: jsonb("segments").$type<ShadowingSegment[]>(),
  entries: jsonb("entries").$type<ListeningEntry[]>(),
  terms: jsonb("terms").$type<SentenceTermRef[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type ShadowingSessionRow = typeof shadowingSessions.$inferSelect;
export type NewShadowingSessionRow = typeof shadowingSessions.$inferInsert;

/**
 * `reading_sessions` — a reading session: the learner works through a passage (from a taxonomy
 * `source` at some `page`), translating it either as one freeform block (`freeform_translation`) or
 * `line_by_line` (`lines`, each with its own translation/summary/correction). An optional whole-passage
 * `summary` covers the case where a literal translation isn't worth it. `word_notes` is a flat list of
 * words the learner was shaky on / didn't know, each optionally flagged for a flashcard list later.
 */
export const readingSessions = pgTable("reading_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  language: text("language").notNull(),
  sourceId: uuid("source_id").references((): AnyPgColumn => sources.id, {
    onDelete: "set null",
  }),
  page: text("page"),
  mode: text("mode").notNull().default("freeform"),
  passage: text("passage"),
  freeformTranslation: text("freeform_translation"),
  summary: text("summary"),
  lines: jsonb("lines").$type<ReadingLine[]>(),
  wordNotes: jsonb("word_notes").$type<WordNote[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type ReadingSessionRow = typeof readingSessions.$inferSelect;
export type NewReadingSessionRow = typeof readingSessions.$inferInsert;

/**
 * `tutors` — the person who ran a {@link lessons lesson}. A lightweight reference entity (name + notes)
 * that lessons associate with and can be filtered by.
 */
export const tutors = pgTable("tutors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type TutorRow = typeof tutors.$inferSelect;
export type NewTutorRow = typeof tutors.$inferInsert;

/**
 * `lessons` — a tutoring session: a `date`, a single associated `tutor` (`onDelete: "set null"` so a
 * lesson survives its tutor's deletion), a running log of `listening_notes` (kana-capable, no
 * timestamps), a flat list of `word_notes` (every field optional), and `answer_sheet_ids` linking the
 * answer sheets worked through (denormalized id list; missing ids are ignored when resolving titles).
 */
export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  date: date("date", {
    mode: "string",
  }).notNull(),
  language: text("language").notNull(),
  tutorId: uuid("tutor_id").references((): AnyPgColumn => tutors.id, {
    onDelete: "set null",
  }),
  listeningNotes: jsonb("listening_notes").$type<LessonListeningNote[]>(),
  wordNotes: jsonb("word_notes").$type<LessonWordNote[]>(),
  answerSheetIds: jsonb("answer_sheet_ids").$type<string[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type LessonRow = typeof lessons.$inferSelect;
export type NewLessonRow = typeof lessons.$inferInsert;

/**
 * `drill_reason_categories` — the reusable "Drill Buddy" mistake-reason taxonomy. Each row is one
 * top-level category (e.g. "Grammar"); its `subcategories` jsonb holds the nested subcategories and
 * their reasons. Drill-session mistakes reference these by id, so the taxonomy is shared across all
 * sessions and gives statistics stable buckets.
 */
export const drillReasonCategories = pgTable("drill_reason_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subcategories: jsonb("subcategories").$type<DrillSubcategory[]>(),
  reasons: jsonb("reasons").$type<DrillReason[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type DrillReasonCategoryRow = typeof drillReasonCategories.$inferSelect;
export type NewDrillReasonCategoryRow = typeof drillReasonCategories.$inferInsert;

/**
 * `drill_sessions` — a mistake-logging journal entry: a `date`, optional `title`/`notes`, and a flat
 * list of `mistakes` (each with what was gotten wrong, an optional correct answer, a reflection, and
 * references into the {@link drillReasonCategories} taxonomy). Standalone — not linked to lessons or
 * tutors.
 */
export const drillSessions = pgTable("drill_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", {
    mode: "string",
  }).notNull(),
  title: text("title"),
  notes: text("notes"),
  mistakes: jsonb("mistakes").$type<DrillMistake[]>(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type DrillSessionRow = typeof drillSessions.$inferSelect;
export type NewDrillSessionRow = typeof drillSessions.$inferInsert;

/**
 * `writing_prompts` — reusable prompts the learner saves to spark a free-write. Each has a Japanese
 * version (`text`, shown by default and used as the display title), an optional English version
 * (`text_en`), and a `difficulty` tag. When starting a My Writing entry the learner can pick one; the
 * chosen prompt is snapshotted onto the writing (`writings.prompt_title` / `writings.prompt_text`).
 */
export const writingPrompts = pgTable("writing_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  textEn: text("text_en"),
  difficulty: text("difficulty").notNull().default("Other"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type WritingPromptRow = typeof writingPrompts.$inferSelect;
export type NewWritingPromptRow = typeof writingPrompts.$inferInsert;

/** `parse_templates` — saved capture-parsing templates the user can reuse. */
export const parseTemplates = pgTable("parse_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Which type the template produces: "sentence" | "vocab". */
  target: text("target").notNull(),
  /** Template body with `{{field}}` tags. */
  body: text("body").notNull(),
  /** Item boundary mode: "fixed" (lines-per-item) | "blank" (blank-line separated). */
  boundary: text("boundary").notNull(),
  ignoreBlankLines: boolean("ignore_blank_lines").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type ParseTemplateRow = typeof parseTemplates.$inferSelect;
export type NewParseTemplateRow = typeof parseTemplates.$inferInsert;

/**
 * `captures` — a raw OCR scan saved as a first-class record (peer of AI Lessons). A capture holds the
 * extracted text, the per-block OCR detail, and the original image, so it can be parsed into
 * sentences later. It optionally references a `sources` taxonomy entry + page. The image is stored
 * inline as `bytea` and served from a dedicated endpoint, never inlined in JSON list/detail responses.
 */
export const captures = pgTable("captures", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  text: text("text").notNull(),
  // An optional user-edited, tidied-up copy of `text`. Null means "no cleaned copy yet"; the raw
  // OCR output in `text` is always preserved untouched.
  cleanedText: text("cleaned_text"),
  // Structured, editable cleanup of the OCR blocks (roles, grouping, ignored languages). Null until
  // the user first saves the Cleaned Blocks workbench.
  cleanedBlocks: jsonb("cleaned_blocks").$type<CleanedBlocks>(),
  blocks: jsonb("blocks").$type<OcrBlock[]>().notNull(),
  engines: jsonb("engines").$type<string[]>().notNull(),
  sourceId: uuid("source_id").references(() => sources.id, {
    onDelete: "set null",
  }),
  page: text("page"),
  notes: text("notes"),
  // Workflow state: "new" (unparsed) → "parsed" once sentences have been mined from it.
  status: text("status").notNull().default("new"),
  image: bytea("image"),
  imageMime: text("image_mime"),
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type CaptureRow = typeof captures.$inferSelect;
export type NewCaptureRow = typeof captures.$inferInsert;

/**
 * `settings` — generic key/value store for server-side configuration edited at runtime (e.g. cloud
 * OCR API keys entered on the Settings page). Values are stored as plaintext text; treat rows as
 * secrets — never log them and never return raw values to the client.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type SettingRow = typeof settings.$inferSelect;

/* ── AI Lessons ─────────────────────────────────────────────────────────────────────────────
 * An AI Lesson is the parent of five normalized child item types. Each child references
 * `ai_lessons.id` with ON DELETE CASCADE and carries an explicit `sort_order` so the authored array
 * order round-trips exactly. Intra-item lists (grammar examples, per-sentence breakdowns, culture
 * terms) live as JSONB on their parent row — they are never queried independently.
 */

/** `ai_lessons` — per-AI-Lesson header/footer chrome + metadata. */
export const aiLessons = pgTable("ai_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  eyebrow: text("eyebrow").notNull(),
  subtitle: text("subtitle").notNull(),
  scrollText: text("scroll_text").notNull(),
  footerText: text("footer_text").notNull(),
  targetLevel: text("target_level").notNull(),
  sourceUrl: text("source_url"),
  videoUrl: text("video_url"),
  sourceLabel: text("source_label"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

/** `ai_lesson_categories` — the vocab filter chips for an AI Lesson. */
export const aiLessonCategories = pgTable(
  "ai_lesson_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aiLessonId: uuid("ai_lesson_id")
      .notNull()
      .references(() => aiLessons.id, {
        onDelete: "cascade",
      }),
    key: text("key").notNull(),
    jp: text("jp").notNull(),
    en: text("en").notNull(),
    icon: text("icon").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  t => [uniqueIndex("ai_lesson_categories_ai_lesson_id_key_unique").on(t.aiLessonId, t.key)],
);

/** `ai_lesson_vocab` — flashcard vocabulary. */
export const aiLessonVocab = pgTable("ai_lesson_vocab", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiLessonId: uuid("ai_lesson_id")
    .notNull()
    .references(() => aiLessons.id, {
      onDelete: "cascade",
    }),
  jp: text("jp").notNull(),
  yomi: text("yomi").notNull(),
  en: text("en").notNull(),
  lvl: text("lvl").notNull(),
  cat: text("cat").notNull(),
  sortOrder: integer("sort_order").notNull(),
  // User annotation (not part of the import contract): Renshuu tracking.
  renshuuAdded: boolean("renshuu_added").notNull().default(false),
  renshuuList: text("renshuu_list"),
});

/** `ai_lesson_grammar` — grammar patterns; examples embedded as JSONB. */
export const aiLessonGrammar = pgTable("ai_lesson_grammar", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiLessonId: uuid("ai_lesson_id")
    .notNull()
    .references(() => aiLessons.id, {
      onDelete: "cascade",
    }),
  pat: text("pat").notNull(),
  gloss: text("gloss").notNull(),
  note: text("note").notNull(),
  examples: jsonb("examples").$type<GrammarExample[]>().notNull(),
  sortOrder: integer("sort_order").notNull(),
  // App-set annotation (not part of the import contract): associated Grammar source tags.
  grammarTerms: jsonb("grammar_terms").$type<SentenceTermRef[]>(),
});

/** `ai_lesson_source_sentences` — real sentences with per-sentence breakdown (JSONB). */
export const aiLessonSourceSentences = pgTable("ai_lesson_source_sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiLessonId: uuid("ai_lesson_id")
    .notNull()
    .references(() => aiLessons.id, {
      onDelete: "cascade",
    }),
  jp: text("jp").notNull(),
  en: text("en").notNull(),
  // `where` is a SQL reserved word — column is quoted, drizzle field is `whereText`.
  whereText: text("where").notNull(),
  url: text("url"),
  grammar: jsonb("grammar").$type<SourceGrammar[]>().notNull(),
  vocab: jsonb("vocab").$type<SourceVocab[]>().notNull(),
  sortOrder: integer("sort_order").notNull(),
  // App-set annotation (not part of the import contract): associated Grammar source tags.
  grammarTerms: jsonb("grammar_terms").$type<SentenceTermRef[]>(),
});

/** `ai_lesson_culture` — short cultural-context cards; terms embedded as JSONB. */
export const aiLessonCulture = pgTable("ai_lesson_culture", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiLessonId: uuid("ai_lesson_id")
    .notNull()
    .references(() => aiLessons.id, {
      onDelete: "cascade",
    }),
  icon: text("icon").notNull(),
  jp: text("jp").notNull(),
  en: text("en").notNull(),
  body: text("body").notNull(),
  terms: jsonb("terms").$type<string[]>().notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export type AiLessonRow = typeof aiLessons.$inferSelect;
export type NewAiLessonRow = typeof aiLessons.$inferInsert;
export type AiLessonCategoryRow = typeof aiLessonCategories.$inferSelect;
export type AiLessonVocabRow = typeof aiLessonVocab.$inferSelect;
export type AiLessonGrammarRow = typeof aiLessonGrammar.$inferSelect;
export type AiLessonSourceSentenceRow = typeof aiLessonSourceSentences.$inferSelect;
export type AiLessonCultureRow = typeof aiLessonCulture.$inferSelect;
