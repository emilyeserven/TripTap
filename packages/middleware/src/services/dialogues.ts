import { desc, eq } from "drizzle-orm";
import type {
  CreateDialogueInput,
  Dialogue,
  DialogueLine,
  UpdateDialogueInput,
} from "@sentence-bank/types";
import { reconcileDialogueLines } from "@sentence-bank/types";
import { db } from "@/db";
import { type DialogueRow, dialogues } from "@/db/schema";
import { crudService } from "@/services/crud";
import { generateFurigana, getFuriganaOverrides } from "@/services/furigana";
import { toIso } from "@/services/rows";

/**
 * A dialogue's `script` is the source of truth for its structure, but its `lines` carry two things the
 * script can't: furigana generated on write, and translations the learner types per line. So every
 * write re-parses the script through the shared `reconcileDialogueLines`, which carries a surviving
 * line's id, reading, and translation across — so editing a script never silently discards
 * translation work — and leaves genuinely new lines with a null reading for this module to fill in.
 */

/** A line still needs analyzing when it has neither a reading nor a recorded failure. */
function needsFurigana(line: DialogueLine): boolean {
  return line.reading === null && line.readingError === null && line.text.trim().length > 0;
}

/**
 * Reconcile `script` against `previous`, then generate furigana for the lines that came back without
 * one. Analysis happens up front and in parallel, never inside a transaction (the same reasoning as
 * `createSentencesMany`), and only for new text — so saving a translation doesn't re-run the analyzer
 * over the whole dialogue.
 */
async function buildLines(script: string, previous: DialogueLine[]): Promise<DialogueLine[] | null> {
  const lines = reconcileDialogueLines(script, previous, () => crypto.randomUUID());
  if (lines.length === 0) return null;
  if (!lines.some(needsFurigana)) return lines;

  const overrides = await getFuriganaOverrides();
  return Promise.all(lines.map(async (line) => {
    if (!needsFurigana(line)) return line;
    const {
      tokens, error,
    } = await generateFurigana(line.text, overrides);
    return {
      ...line,
      reading: tokens,
      readingError: error,
    };
  }));
}

/** Drop blank labels and duplicates from a self-speaker list; an empty list stores as null. */
function normalizeSelfSpeakers(speakers: string[] | null | undefined): string[] | null {
  const cleaned = [...new Set((speakers ?? []).map(s => s.trim()).filter(Boolean))];
  return cleaned.length > 0 ? cleaned : null;
}

/** Map a DB row to the shared `Dialogue` wire type. */
function toDialogue(row: DialogueRow): Dialogue {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    language: row.language,
    script: row.script,
    lines: row.lines ?? null,
    bookmarkId: row.bookmarkId,
    bookmarkTitle: row.bookmarkTitle,
    bookmarkUrl: row.bookmarkUrl,
    section: row.section ?? null,
    selfSpeakers: row.selfSpeakers ?? null,
    countsTowardXp: row.countsTowardXp,
    learningArea: row.learningArea ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one dialogue row — async, because the lines carry generated furigana. */
async function toInsert(input: CreateDialogueInput) {
  return {
    date: input.date,
    title: input.title,
    language: input.language,
    script: input.script,
    lines: await buildLines(input.script, input.lines ?? []),
    bookmarkId: input.bookmarkId ?? null,
    bookmarkTitle: input.bookmarkTitle ?? null,
    bookmarkUrl: input.bookmarkUrl ?? null,
    section: input.section ?? null,
    selfSpeakers: normalizeSelfSpeakers(input.selfSpeakers),
    countsTowardXp: input.countsTowardXp ?? false,
    learningArea: input.learningArea ?? null,
  };
}

const crud = crudService(dialogues, {
  toWire: toDialogue,
  toInsert,
  orderBy: [desc(dialogues.date), desc(dialogues.createdAt)],
});

/** List dialogues, most recent date first. */
export const listDialogues = crud.list;
export const getDialogue = crud.get;
export const createDialogue = crud.create;
export const deleteDialogue = crud.remove;

/** Hand-written: the script has to be reconciled against the *stored* lines before the update. */
export async function updateDialogue(
  id: string,
  input: UpdateDialogueInput,
): Promise<Dialogue | null> {
  const [existing] = await db.select().from(dialogues).where(eq(dialogues.id, id));
  if (!existing) return null;

  const {
    lines: incoming, selfSpeakers, ...columns
  } = input;
  // Translations come from the request when the client sent edited lines, and from the stored row
  // otherwise. Either way the speakers and text are re-derived from the script, never trusted.
  const carry = incoming ?? existing.lines ?? [];

  const [row] = await db
    .update(dialogues)
    .set({
      ...columns,
      lines: await buildLines(columns.script ?? existing.script, carry),
      ...(selfSpeakers !== undefined
        ? {
          selfSpeakers: normalizeSelfSpeakers(selfSpeakers),
        }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(dialogues.id, id))
    .returning();
  return row ? toDialogue(row) : null;
}
