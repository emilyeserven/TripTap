import { desc } from "drizzle-orm";
import type {
  CreateCultureNoteInput,
  CultureNote,
  IconKey,
  UpdateCultureNoteInput,
} from "@sentence-bank/types";
import { cultureNotes, type CultureNoteRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/**
 * A note must carry an English or a Japanese body — nullable columns can't express that, and the
 * route's JSON Schema can't guard a PATCH clearing one body, so the rule lives here. Routes map it
 * to a 400.
 */
export class CultureNoteBodyError extends Error {
  constructor() {
    super("A culture note needs an English or Japanese body.");
  }
}

/** Map a DB row to the shared `CultureNote` wire type. */
function toCultureNote(row: CultureNoteRow): CultureNote {
  return {
    id: row.id,
    titleJp: row.titleJp,
    titleEn: row.titleEn,
    bodyEn: row.bodyEn,
    bodyJa: row.bodyJa,
    icon: row.icon as IconKey | null,
    terms: row.terms,
    topicIds: row.topicIds,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one note row, from the create input. */
function toInsert(input: CreateCultureNoteInput) {
  return {
    titleJp: input.titleJp ?? null,
    titleEn: input.titleEn ?? null,
    bodyEn: input.bodyEn ?? null,
    bodyJa: input.bodyJa ?? null,
    icon: input.icon ?? null,
    terms: input.terms ?? [],
    topicIds: input.topicIds ?? [],
  };
}

const crud = crudService(cultureNotes, {
  toWire: toCultureNote,
  toInsert,
  orderBy: [desc(cultureNotes.createdAt)],
});

const hasBody = (value: string | null | undefined) => !!value?.trim();

/** List culture notes, newest first. */
export const listCultureNotes = crud.list;
export const getCultureNote = crud.get;
export const deleteCultureNote = crud.remove;

/** Create a note; throws {@link CultureNoteBodyError} before touching the DB when both bodies are blank. */
export async function createCultureNote(input: CreateCultureNoteInput): Promise<CultureNote> {
  if (!hasBody(input.bodyEn) && !hasBody(input.bodyJa)) throw new CultureNoteBodyError();
  return crud.create(input);
}

/**
 * Patch a note; `null` when the id doesn't exist. Merges the incoming bodies over the stored ones
 * first, so a PATCH clearing one body still has to leave the other behind.
 */
export async function updateCultureNote(
  id: string,
  input: UpdateCultureNoteInput,
): Promise<CultureNote | null> {
  const existing = await crud.get(id);
  if (!existing) return null;
  const bodyEn = input.bodyEn !== undefined ? input.bodyEn : existing.bodyEn;
  const bodyJa = input.bodyJa !== undefined ? input.bodyJa : existing.bodyJa;
  if (!hasBody(bodyEn) && !hasBody(bodyJa)) throw new CultureNoteBodyError();
  return crud.update(id, input);
}
