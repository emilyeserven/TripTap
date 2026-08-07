/**
 * Shared "Grammar Note" domain types.
 *
 * A grammar note is a rich, personal write-up of a single grammar *usage*, keyed to one tag from the
 * Grammar Source (the bookmarks "grammar" channel). Each usage of a surface form is its own note — は as
 * a topic marker and は as a contrastive marker are two notes with the same {@link GrammarNote.title}
 * but different {@link GrammarNote.nuance}. Notes collect constructions, relate to other grammar
 * points, link resources, and auto-gather every sentence carrying the same grammar tag. Consumed by
 * both the Fastify API and the React client.
 */

import type { BookmarkSectionRef, SentenceTermRef } from "./index.js";

import { z } from "zod";

import { objectJsonSchema } from "./json-schema.js";
import { bookmarkSectionRefWriteSchema } from "./session.js";
import { termRefSchema } from "./terms.js";

/**
 * One selectable alternative inside a {@link ConstructionSlot}: a word class ("Adj", "Verb") with
 * optional inflection forms, or a literal run of text (a particle etc.).
 */
export interface ConstructionAlternative {
  /** Client-generated stable key (crypto.randomUUID()). */
  id: string;
  /** Display label — a word-class name ("Adj", "Verb", "Noun") or the literal text when `literal`. */
  label: string;
  /** Selectable inflection forms, e.g. ["Short", "Polite"]. Empty when there is no form choice. */
  forms: string[];
  /** True when `label` is literal text — rendered bare in the derived pattern, no forms/tag. */
  literal?: boolean;
  /** Optional grammar-channel tag; the read view links it to its grammar note. */
  term?: SentenceTermRef | null;
}

/**
 * One ordered block of a construction. Its alternatives are interchangeable — the read view lets the
 * learner switch between them (and pick a form) like swapping a block in a sentence.
 */
export interface ConstructionSlot {
  /** Client-generated stable key (crypto.randomUUID()). */
  id: string;
  alternatives: ConstructionAlternative[];
}

/** One "possible construction" of a grammar point: a pattern, an explanation, and example sentences. */
export interface GrammarConstruction {
  /** Client-generated stable key (crypto.randomUUID()). */
  id: string;
  /** The construction pattern, e.g. "〜ないといけない". Auto-derived from `slots` when present. */
  pattern: string;
  /** Block-based template. Absent/empty on flat constructions — render `pattern` instead. */
  slots?: ConstructionSlot[];
  /** English meaning template with [Label] placeholders matched to slots by alternative label, e.g. "A [Noun] who is [Adj/Verb]". */
  meaning?: string | null;
  /** Explanation of this construction, or null. Blocks referenced as [Label] tokens like `meaning`. */
  note: string | null;
  /**
   * Legacy hand-linked bank sentences. No longer written by the UI — example sentences are
   * auto-matched to tagged sentences by the construction's literal text — kept so old rows round-trip.
   */
  sentenceIds?: string[];
}

/** How one grammar point relates to another. */
export type GrammarRelationKind = "similar" | "antonym";

/** A user-declared link from this grammar point to another Grammar Source tag. */
export interface GrammarRelation {
  /** The related grammar tag id (Grammar Source). */
  tagId: string;
  /** Denormalized display name of the related tag. */
  tagName: string;
  kind: GrammarRelationKind;
  /** Why they're similar / opposite, or null. */
  note: string | null;
}

/**
 * A resource for a grammar usage (video, textbook page, …), drawn from the Resources source (the
 * bookmarks "resource" channel).
 */
export interface GrammarResourceRef {
  /** Bookmark record id (resource channel), or a crypto.randomUUID() for a freeform entry. */
  id: string;
  /** Denormalized display title. */
  title: string;
  /** Deep link, when the record has one. */
  url: string | null;
  /** Freeform locator, e.g. "Genki I p.42" or "watch 3:10–4:00". */
  note: string | null;
  /** A specific section of the bookmark (only for real bookmark records); null when none/freeform. */
  section?: BookmarkSectionRef | null;
}

/** A user's rich note about a single grammar usage (keyed to one Grammar Source tag). */
export interface GrammarNote {
  id: string;
  /** Grammar Source tag/term id. Unique across notes — one note per grammar usage. */
  tagId: string;
  /** Denormalized tag display name. */
  tagName: string;
  /** The surface form as written, e.g. "は". Defaults from `tagName`; the key for "other usages". */
  title: string;
  /** Short memory-jogging descriptor telling this usage apart from others, e.g. "topic marker". */
  nuance: string | null;
  /** A general overview of the grammar point, or null. */
  summary: string | null;
  constructions: GrammarConstruction[];
  relations: GrammarRelation[];
  resources: GrammarResourceRef[];
  /** Starred grammar points are boosted by the Start Something suggestion ranking. */
  starred: boolean;
  /** ISO-8601 timestamp of when the note was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

const constructionAlternativeSchema = z.object({
  id: z.string(),
  label: z.string(),
  forms: z.array(z.string()),
  literal: z.boolean().optional(),
  term: termRefSchema.nullable().optional(),
});

const constructionSlotSchema = z.object({
  id: z.string(),
  alternatives: z.array(constructionAlternativeSchema),
});

const constructionSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  slots: z.array(constructionSlotSchema).optional(),
  meaning: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  sentenceIds: z.array(z.string()).optional(),
});

const relationSchema = z.object({
  tagId: z.string(),
  tagName: z.string(),
  kind: z.enum(["similar", "antonym"]),
  note: z.string().nullable().optional(),
});

const resourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  // The same stored bookmark-section shape the session routes accept — it was inlined here once more.
  section: bookmarkSectionRefWriteSchema.optional(),
});

/** Payload for creating a grammar note. `tagId`, `tagName`, and `title` are required. */
export const createGrammarNoteSchema = z.object({
  tagId: z.string().min(1),
  tagName: z.string().min(1),
  title: z.string().min(1),
  nuance: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  constructions: z.array(constructionSchema).optional(),
  relations: z.array(relationSchema).optional(),
  resources: z.array(resourceSchema).optional(),
  starred: z.boolean().optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createGrammarNoteJsonSchema = objectJsonSchema(createGrammarNoteSchema);

/**
 * JSON Schema (draft-07) for the PATCH body.
 *
 * Not `updateBodyOf(createGrammarNoteJsonSchema)` like most entities: `tagId` is the note's identity,
 * and the hand-written PATCH body deliberately left it out so an update can't re-key a note. Derived
 * with the same omission so that stays true.
 */
export const updateGrammarNoteJsonSchema
  = objectJsonSchema(createGrammarNoteSchema.omit({
    tagId: true,
  }).partial());

/**
 * The three list fields are overridden rather than inferred: the route requires only the identifying
 * fields on each entry (`note` on a construction/relation, `url`/`note` on a resource are optional
 * there), while the stored types declare them present-but-nullable. Inferring would loosen the stored
 * types across every reader; narrowing the schemas would reject payloads the API accepts today. Same
 * call as `CreateWritingInput.corrections`.
 */
export type CreateGrammarNoteInput = Omit<
  z.infer<typeof createGrammarNoteSchema>,
  "constructions" | "relations" | "resources"
> & {
  constructions?: GrammarConstruction[];
  relations?: GrammarRelation[];
  resources?: GrammarResourceRef[];
};

/** Payload for partially updating a grammar note. `tagId` is the note's identity and is immutable. */
export type UpdateGrammarNoteInput = Partial<Omit<CreateGrammarNoteInput, "tagId">>;
