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

import type { BookmarkSectionRef } from "./index.js";

/** One "possible construction" of a grammar point: a pattern, an explanation, and example sentences. */
export interface GrammarConstruction {
  /** Client-generated stable key (crypto.randomUUID()). */
  id: string;
  /** The construction pattern, e.g. "〜ないといけない". */
  pattern: string;
  /** Explanation of this construction, or null. */
  note: string | null;
  /** Ids of hand-linked bank sentences that demonstrate this construction. */
  sentenceIds: string[];
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

/** Payload for creating a grammar note. `tagId`, `tagName`, and `title` are required. */
export interface CreateGrammarNoteInput {
  tagId: string;
  tagName: string;
  title: string;
  nuance?: string | null;
  summary?: string | null;
  constructions?: GrammarConstruction[];
  relations?: GrammarRelation[];
  resources?: GrammarResourceRef[];
  starred?: boolean;
}

/** Payload for partially updating a grammar note. `tagId` is the note's identity and is immutable. */
export type UpdateGrammarNoteInput = Partial<Omit<CreateGrammarNoteInput, "tagId">>;
