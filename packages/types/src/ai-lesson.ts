/**
 * Canonical "AI Lesson" contract for sentence-bank.
 * =================================================
 *
 * An **AI Lesson** is a self-contained language-study unit rendered by one reusable template
 * (5 tabs: Culture / Vocab / Grammar / Source / Practice). AI Lessons are authored as **JSON**,
 * pasted into the app, validated against the schemas below, and persisted with each item as its
 * own row tagged with the parent AI Lesson.
 *
 * This file is the single source of truth for that shape. From the Zod schemas we derive:
 *   - the TypeScript types (`z.infer`), consumed by client + middleware, and
 *   - a JSON Schema (`aiLessonImportJsonSchema`), fed directly to Fastify's route validation,
 * so client-side and server-side validation can never drift.
 *
 * NOTE: The `skills/sentence-bank-lesson/SKILL.md` authoring skill is written *from* this contract.
 * If you change a field here, update that skill (and the client icon-map for new icon keys).
 *
 * ── The import payload (what you paste) ────────────────────────────────────────────────────────
 * {
 *   "slug": "hagi-e-no-tabi",          // url-safe id, unique per AI Lesson
 *   "title": "萩への旅",                // plain text (no markup)
 *   "eyebrow": "A Japanese Lesson ...",// small kicker above the title
 *   "subtitle": "Hagi, Yamaguchi · ...",
 *   "scrollText": "萩の御厨 高大",        // vertical decorative text in the header
 *   "footerText": "Study aid built from ...",
 *   "targetLevel": "N4",               // the AI Lesson's overall JLPT target
 *   "sourceUrl": "https://...",        // optional — attribution link
 *   "videoUrl": "https://...",         // optional — e.g. a YouTube source
 *   "sourceLabel": "From the inn",     // optional — EN label override for the "Source" tab
 *   "categories": [ Category, ... ],   // vocab groupings (the filter chips)
 *   "vocab":      [ Vocab, ... ],      // flashcard vocabulary
 *   "grammar":    [ Grammar, ... ],    // grammar patterns w/ examples
 *   "source":     [ SourceSentence ],  // real sentences w/ per-sentence breakdown
 *   "culture":    [ CultureNote, ... ] // short cultural context cards
 * }
 *
 * Each item's fields are documented on its schema below. Array order is preserved on import.
 * Unknown keys are rejected (strict). `lvl` values are freeform strings — "N1".."N5" render as a
 * JLPT badge; anything else ("travel", "local", "food", ...) renders as a plain tag.
 */

import type { SentenceTermRef } from "./index.js";

import { z } from "zod";

/**
 * Allowed icon keys (lucide-react). Stored as strings in JSON and mapped to components client-side
 * (see the client `icon-map`). Keep this list and the client map in sync.
 */
export const ICON_KEYS = [
  "sparkles",
  "home",
  "utensils",
  "landmark",
  "bus",
  "waves",
  "sun",
  "book-open",
  "graduation-cap",
  "scroll-text",
  "ghost",
  "message-square",
  "music",
  "history",
  "clapperboard",
  "map-pin",
] as const;

export const iconKeySchema = z.enum(ICON_KEYS);
export type IconKey = z.infer<typeof iconKeySchema>;

/** A vocabulary flashcard. */
export const vocabInputSchema = z.strictObject({
  /** Word in the target language (kanji/kana). Also the key VocabPill hovers resolve against. */
  jp: z.string().min(1),
  /** Reading (furigana), e.g. "やど". */
  yomi: z.string().min(1),
  /** English gloss. */
  en: z.string().min(1),
  /** Level tag — "N1".."N5" (JLPT badge) or a freeform tag ("travel", "local", ...). */
  lvl: z.string().min(1),
  /** Category key — must match a `categories[].key`. */
  cat: z.string().min(1),
});

/** A vocab category / filter chip. */
export const categoryInputSchema = z.strictObject({
  /** Stable key referenced by `vocab[].cat`. */
  key: z.string().min(1),
  /** Japanese label. */
  jp: z.string().min(1),
  /** English label. */
  en: z.string().min(1),
  /** Icon key (see ICON_KEYS). */
  icon: iconKeySchema,
});

/** An example sentence under a grammar pattern. */
export const grammarExampleSchema = z.strictObject({
  jp: z.string().min(1),
  en: z.string().min(1),
});

/** A grammar pattern with explanation + examples. */
export const grammarInputSchema = z.strictObject({
  /** The pattern itself, e.g. "〜たいんですが". */
  pat: z.string().min(1),
  /** Short gloss of what it does. */
  gloss: z.string().min(1),
  /** Paragraph-length explanation. */
  note: z.string().min(1),
  /** Example sentences. */
  ex: z.array(grammarExampleSchema),
});

/** A grammar note attached to a source sentence breakdown. */
export const sourceGrammarSchema = z.strictObject({
  /** Pattern/point. */
  p: z.string().min(1),
  /** Description. */
  d: z.string().min(1),
});

/** A vocab item attached to a source sentence breakdown. */
export const sourceVocabSchema = z.strictObject({
  /** Word. */
  w: z.string().min(1),
  /** Reading. */
  y: z.string().min(1),
  /** Meaning. */
  m: z.string().min(1),
  /** Level tag. */
  lvl: z.string().min(1),
});

/** A real sentence lifted from a source, with a full breakdown. */
export const sourceSentenceInputSchema = z.strictObject({
  /** The sentence in the target language. */
  jp: z.string().min(1),
  /** Translation. */
  en: z.string().min(1),
  /** Where it came from — a page name, a commenter handle, etc. */
  where: z.string().min(1),
  /** Optional deep link to the exact source. */
  url: z.string().optional().nullable(),
  /** Grammar points in this sentence. */
  grammar: z.array(sourceGrammarSchema),
  /** Vocabulary in this sentence. */
  vocab: z.array(sourceVocabSchema),
});

/** A short cultural-context card. */
export const cultureInputSchema = z.strictObject({
  /** Icon key (see ICON_KEYS). */
  icon: iconKeySchema,
  /** Japanese heading. */
  jp: z.string().min(1),
  /** English heading. */
  en: z.string().min(1),
  /** Body paragraph. */
  body: z.string().min(1),
  /** Vocab terms to surface as hover chips (should match `vocab[].jp` where possible). */
  terms: z.array(z.string()),
});

/** Per-AI-Lesson header/footer chrome + metadata. */
export const aiLessonMetaSchema = z.strictObject({
  /** URL-safe unique id. */
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
  title: z.string().min(1),
  eyebrow: z.string().min(1),
  subtitle: z.string().min(1),
  scrollText: z.string().min(1),
  footerText: z.string().min(1),
  targetLevel: z.string().min(1),
  sourceUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  /** EN label override for the "Source" tab (e.g. "From the inn"). Defaults to "Source". */
  sourceLabel: z.string().optional().nullable(),
});

/** The full import payload. */
export const aiLessonImportSchema = aiLessonMetaSchema.extend({
  categories: z.array(categoryInputSchema),
  vocab: z.array(vocabInputSchema),
  grammar: z.array(grammarInputSchema),
  source: z.array(sourceSentenceInputSchema),
  culture: z.array(cultureInputSchema),
});

/**
 * JSON Schema derived from the Zod contract, targeted at draft-07 for Fastify's Ajv.
 * Used verbatim as the `body` schema of `POST /api/ai-lessons/import`.
 */
export const aiLessonImportJsonSchema = z.toJSONSchema(aiLessonImportSchema, {
  target: "draft-7",
});

/* ── Inferred input types ─────────────────────────────────────────────────────────────────── */
export type AiLessonImportInput = z.infer<typeof aiLessonImportSchema>;
export type AiLessonMetaInput = z.infer<typeof aiLessonMetaSchema>;
export type VocabInput = z.infer<typeof vocabInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type GrammarInput = z.infer<typeof grammarInputSchema>;
export type GrammarExample = z.infer<typeof grammarExampleSchema>;
export type SourceSentenceInput = z.infer<typeof sourceSentenceInputSchema>;
export type SourceGrammar = z.infer<typeof sourceGrammarSchema>;
export type SourceVocab = z.infer<typeof sourceVocabSchema>;
export type CultureInput = z.infer<typeof cultureInputSchema>;

/* ── Persisted / response types ───────────────────────────────────────────────────────────── */

/** The parent AI Lesson row as returned by the API. */
export interface AiLessonRecord extends AiLessonMetaInput {
  id: string;
  /** ISO-8601. */
  createdAt: string;
}

/** A persisted child item carries its own id and its position within the AI Lesson. */
type Persisted<T> = T & { id: string;
  sortOrder: number; };

/**
 * A persisted vocab item. Carries the user's Renshuu annotation (whether it's been added to a Renshuu
 * list and, if so, which one). These are NOT part of the import contract — they're set via the app.
 */
export type VocabItem = Persisted<VocabInput> & {
  renshuuAdded: boolean;
  renshuuList: string | null;
};
export type CategoryItem = Persisted<CategoryInput>;
/**
 * A persisted grammar pattern. `grammarTerms` are Grammar source tags associated via the app (NOT
 * part of the import contract), null when never tagged.
 */
export type GrammarItem = Persisted<GrammarInput> & {
  grammarTerms: SentenceTermRef[] | null;
};
/** A persisted source sentence, with app-set Grammar source tags (`grammarTerms`). */
export type SourceSentenceItem = Persisted<SourceSentenceInput> & {
  grammarTerms: SentenceTermRef[] | null;
};
export type CultureItem = Persisted<CultureInput>;

/** Payload for updating a vocab item's Renshuu annotation. */
export interface VocabRenshuuUpdate {
  renshuuAdded?: boolean;
  renshuuList?: string | null;
}

/** Payload for updating the Grammar source tags on an AI Lesson grammar item or source sentence. */
export interface GrammarTermsUpdate {
  grammarTerms: SentenceTermRef[] | null;
}

/** A full AI Lesson with all children, assembled for the viewer. */
export interface AiLessonDetail extends AiLessonRecord {
  categories: CategoryItem[];
  vocab: VocabItem[];
  grammar: GrammarItem[];
  source: SourceSentenceItem[];
  culture: CultureItem[];
}

/** Lightweight list-view shape. */
export interface AiLessonSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  targetLevel: string;
  createdAt: string;
  counts: {
    categories: number;
    vocab: number;
    grammar: number;
    source: number;
    culture: number;
  };
}

/** An item tagged with the AI Lesson it belongs to, for cross-AI-Lesson browse views. */
export type WithAiLesson<T> = T & { aiLessonSlug: string;
  aiLessonTitle: string; };

/** All AI Lesson content flattened across AI Lessons, for the global Culture/Vocab/Grammar/Sentences pages. */
export interface AiLessonContent {
  vocab: WithAiLesson<VocabItem>[];
  culture: WithAiLesson<CultureItem>[];
  grammar: WithAiLesson<GrammarItem>[];
  sentences: WithAiLesson<SourceSentenceItem>[];
}
