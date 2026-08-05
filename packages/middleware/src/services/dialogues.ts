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
import { generateFurigana, getFuriganaOverrides } from "@/services/furigana";

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
    selfSpeakers: row.selfSpeakers ?? null,
    countsTowardXp: row.countsTowardXp,
    learningArea: row.learningArea ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** List dialogues, most recent date first. */
export async function listDialogues(): Promise<Dialogue[]> {
  const rows = await db
    .select()
    .from(dialogues)
    .orderBy(desc(dialogues.date), desc(dialogues.createdAt));
  return rows.map(toDialogue);
}

export async function getDialogue(id: string): Promise<Dialogue | null> {
  const [row] = await db.select().from(dialogues).where(eq(dialogues.id, id));
  return row ? toDialogue(row) : null;
}

export async function createDialogue(input: CreateDialogueInput): Promise<Dialogue> {
  const [row] = await db.insert(dialogues).values({
    date: input.date,
    title: input.title,
    language: input.language,
    script: input.script,
    lines: await buildLines(input.script, input.lines ?? []),
    selfSpeakers: normalizeSelfSpeakers(input.selfSpeakers),
    countsTowardXp: input.countsTowardXp ?? false,
    learningArea: input.learningArea ?? null,
  }).returning();
  return toDialogue(row);
}

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

export async function deleteDialogue(id: string): Promise<boolean> {
  const rows = await db.delete(dialogues).where(eq(dialogues.id, id)).returning({
    id: dialogues.id,
  });
  return rows.length > 0;
}
