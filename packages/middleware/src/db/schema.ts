import type {
  GrammarExample,
  SourceGrammar,
  SourceVocab,
} from "@sentence-bank/types";
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** `sentences` table — one row per stored example sentence. */
export const sentences = pgTable("sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  translation: text("translation").notNull(),
  language: text("language").notNull(),
  source: text("source"),
  notes: text("notes"),
  tags: text("tags"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type SentenceRow = typeof sentences.$inferSelect;
export type NewSentenceRow = typeof sentences.$inferInsert;

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
