/**
 * Shared "Theory study" domain types.
 *
 * A theory session logs time spent learning grammar/theory (a textbook chapter, an explainer video,
 * a write-up) that doesn't fit the drill/reading/listening slices. It earns Grammar XP either by the
 * number of pages covered (weighted by how dense the material is) or by a self-reported word count,
 * plus a self-reported count of "notes" taken (each worth a small amount of XP) and an optional
 * freeform note. Consumed by both the Fastify API and the React client.
 */

/** How a theory session's core XP is measured: by pages read, or by a word count. */
export type TheoryEntryMode = "pages" | "words";

/** How information-dense the studied pages are, scaling the per-page XP. */
export type TheoryDensity = "dense" | "medium" | "light";

/** A logged theory-study session. */
export interface TheorySession {
  id: string;
  /** ISO date (YYYY-MM-DD) the studying happened. */
  date: string;
  /** Optional label for the session; null when unnamed. */
  title: string | null;
  /** Whether XP is counted from {@link pages}+{@link density} or from {@link wordCount}. */
  entryMode: TheoryEntryMode;
  /** Pages covered, in "pages" mode; null otherwise. */
  pages: number | null;
  /** Density of the covered pages, in "pages" mode; null otherwise. */
  density: TheoryDensity | null;
  /** Words covered, in "words" mode; null otherwise. */
  wordCount: number | null;
  /** Self-reported count of notes taken, each worth a little XP. */
  notesCount: number;
  /** Optional freeform notes about the session; null when none. Not XP-bearing. */
  notes: string | null;
  /** ISO-8601 timestamp of when the session was added. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a theory session. `date` and `entryMode` are required. */
export interface CreateTheorySessionInput {
  date: string;
  entryMode: TheoryEntryMode;
  title?: string | null;
  pages?: number | null;
  density?: TheoryDensity | null;
  wordCount?: number | null;
  notesCount?: number;
  notes?: string | null;
}

/** Payload for partially updating a theory session. */
export type UpdateTheorySessionInput = Partial<CreateTheorySessionInput>;
