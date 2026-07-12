import { desc, eq } from "drizzle-orm";
import type {
  CreateWritingPromptInput,
  UpdateWritingPromptInput,
  WritingPrompt,
} from "@sentence-bank/types";
import { db } from "@/db";
import { writingPrompts, type WritingPromptRow } from "@/db/schema";

/** Map a DB row to the shared `WritingPrompt` wire type. */
export function toWritingPrompt(row: WritingPromptRow): WritingPrompt {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one writing-prompt row, from the create input. */
function toInsert(input: CreateWritingPromptInput) {
  return {
    title: input.title,
    text: input.text,
  };
}

/** List writing prompts, newest first. */
export async function listWritingPrompts(): Promise<WritingPrompt[]> {
  const rows = await db.select().from(writingPrompts).orderBy(desc(writingPrompts.createdAt));
  return rows.map(toWritingPrompt);
}

export async function getWritingPrompt(id: string): Promise<WritingPrompt | null> {
  const [row] = await db.select().from(writingPrompts).where(eq(writingPrompts.id, id));
  return row ? toWritingPrompt(row) : null;
}

export async function createWritingPrompt(
  input: CreateWritingPromptInput,
): Promise<WritingPrompt> {
  const [row] = await db.insert(writingPrompts).values(toInsert(input)).returning();
  return toWritingPrompt(row);
}

export async function updateWritingPrompt(
  id: string,
  input: UpdateWritingPromptInput,
): Promise<WritingPrompt | null> {
  const [row] = await db
    .update(writingPrompts)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(writingPrompts.id, id))
    .returning();
  return row ? toWritingPrompt(row) : null;
}

export async function deleteWritingPrompt(id: string): Promise<boolean> {
  const rows = await db.delete(writingPrompts).where(eq(writingPrompts.id, id)).returning({
    id: writingPrompts.id,
  });
  return rows.length > 0;
}
