import { asc, eq } from "drizzle-orm";
import type {
  CreateGrammarNoteInput,
  GrammarNote,
  UpdateGrammarNoteInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { grammarNotes, type GrammarNoteRow } from "@/db/schema";

/** Thrown when creating a note for a grammar tag that already has one (unique `tag_id`). */
export class GrammarNoteExistsError extends Error {
  constructor() {
    super("A grammar note already exists for this tag");
    this.name = "GrammarNoteExistsError";
  }
}

/** Map a DB row to the shared `GrammarNote` wire type (jsonb arrays coalesced to `[]`). */
function toGrammarNote(row: GrammarNoteRow): GrammarNote {
  return {
    id: row.id,
    tagId: row.tagId,
    tagName: row.tagName,
    title: row.title,
    nuance: row.nuance,
    summary: row.summary,
    constructions: row.constructions ?? [],
    relations: row.relations ?? [],
    resources: row.resources ?? [],
    starred: row.starred,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one grammar note, from the create input. */
function toInsert(input: CreateGrammarNoteInput) {
  return {
    tagId: input.tagId,
    tagName: input.tagName,
    title: input.title,
    nuance: input.nuance ?? null,
    summary: input.summary ?? null,
    constructions: input.constructions ?? [],
    relations: input.relations ?? [],
    resources: input.resources ?? [],
    starred: input.starred ?? false,
  };
}

/** True when a Postgres error is a unique-violation (SQLSTATE 23505). */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}

/** List grammar notes, alphabetically by title. */
export async function listGrammarNotes(): Promise<GrammarNote[]> {
  const rows = await db.select().from(grammarNotes).orderBy(asc(grammarNotes.title));
  return rows.map(toGrammarNote);
}

export async function getGrammarNote(id: string): Promise<GrammarNote | null> {
  const [row] = await db.select().from(grammarNotes).where(eq(grammarNotes.id, id));
  return row ? toGrammarNote(row) : null;
}

/** Find the (at most one) note for a grammar tag — used by dedupe and the AI-lesson reverse link. */
export async function getGrammarNoteByTagId(tagId: string): Promise<GrammarNote | null> {
  const [row] = await db.select().from(grammarNotes).where(eq(grammarNotes.tagId, tagId));
  return row ? toGrammarNote(row) : null;
}

export async function createGrammarNote(input: CreateGrammarNoteInput): Promise<GrammarNote> {
  try {
    const [row] = await db.insert(grammarNotes).values(toInsert(input)).returning();
    return toGrammarNote(row);
  }
  catch (err) {
    if (isUniqueViolation(err)) throw new GrammarNoteExistsError();
    throw err;
  }
}

export async function updateGrammarNote(
  id: string,
  input: UpdateGrammarNoteInput,
): Promise<GrammarNote | null> {
  const [row] = await db
    .update(grammarNotes)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(grammarNotes.id, id))
    .returning();
  return row ? toGrammarNote(row) : null;
}

export async function deleteGrammarNote(id: string): Promise<boolean> {
  const rows = await db.delete(grammarNotes).where(eq(grammarNotes.id, id)).returning({
    id: grammarNotes.id,
  });
  return rows.length > 0;
}
