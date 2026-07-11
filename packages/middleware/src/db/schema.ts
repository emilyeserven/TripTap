import type {
  CleanedBlocks,
  GrammarExample,
  OcrBlock,
  SourceGrammar,
  SourceVocab,
} from "@sentence-bank/types";
import { type AnyPgColumn, boolean, customType, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
  // The capture this was mined from, for traceability. Nulled (not deleted) if the capture is removed.
  captureId: uuid("capture_id").references((): AnyPgColumn => captures.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type SentenceRow = typeof sentences.$inferSelect;
export type NewSentenceRow = typeof sentences.$inferInsert;

/** `vocab` — standalone vocabulary bank (peer of `sentences`, distinct from lesson-scoped vocab). */
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
 * `captures` — a raw OCR scan saved as a first-class record (peer of lessons). A capture holds the
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

/* ── Lessons ────────────────────────────────────────────────────────────────────────────────
 * A lesson is the parent of five normalized child item types. Each child references `lessons.id`
 * with ON DELETE CASCADE and carries an explicit `sort_order` so the authored array order round-
 * trips exactly. Intra-item lists (grammar examples, per-sentence breakdowns, culture terms) live
 * as JSONB on their parent row — they are never queried independently.
 */

/** `lessons` — per-lesson header/footer chrome + metadata. */
export const lessons = pgTable("lessons", {
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

/** `lesson_categories` — the vocab filter chips for a lesson. */
export const lessonCategories = pgTable(
  "lesson_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, {
        onDelete: "cascade",
      }),
    key: text("key").notNull(),
    jp: text("jp").notNull(),
    en: text("en").notNull(),
    icon: text("icon").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  t => [uniqueIndex("lesson_categories_lesson_id_key_unique").on(t.lessonId, t.key)],
);

/** `lesson_vocab` — flashcard vocabulary. */
export const lessonVocab = pgTable("lesson_vocab", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, {
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

/** `lesson_grammar` — grammar patterns; examples embedded as JSONB. */
export const lessonGrammar = pgTable("lesson_grammar", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, {
      onDelete: "cascade",
    }),
  pat: text("pat").notNull(),
  gloss: text("gloss").notNull(),
  note: text("note").notNull(),
  examples: jsonb("examples").$type<GrammarExample[]>().notNull(),
  sortOrder: integer("sort_order").notNull(),
});

/** `lesson_source_sentences` — real sentences with per-sentence breakdown (JSONB). */
export const lessonSourceSentences = pgTable("lesson_source_sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, {
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
});

/** `lesson_culture` — short cultural-context cards; terms embedded as JSONB. */
export const lessonCulture = pgTable("lesson_culture", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, {
      onDelete: "cascade",
    }),
  icon: text("icon").notNull(),
  jp: text("jp").notNull(),
  en: text("en").notNull(),
  body: text("body").notNull(),
  terms: jsonb("terms").$type<string[]>().notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export type LessonRow = typeof lessons.$inferSelect;
export type NewLessonRow = typeof lessons.$inferInsert;
export type LessonCategoryRow = typeof lessonCategories.$inferSelect;
export type LessonVocabRow = typeof lessonVocab.$inferSelect;
export type LessonGrammarRow = typeof lessonGrammar.$inferSelect;
export type LessonSourceSentenceRow = typeof lessonSourceSentences.$inferSelect;
export type LessonCultureRow = typeof lessonCulture.$inferSelect;
