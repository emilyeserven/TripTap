import { desc, eq } from "drizzle-orm";
import type {
  CreateShadowingListInput,
  ShadowingList,
  UpdateShadowingListInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { shadowingLists, type ShadowingListRow } from "@/db/schema";

/** Map a DB row to the shared `ShadowingList` wire type. */
function toShadowingList(row: ShadowingListRow): ShadowingList {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    sentenceIds: row.sentenceIds ?? [],
    mySentenceIds: row.mySentenceIds ?? [],
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one shadowing-list row, from the create input. */
function toInsert(input: CreateShadowingListInput) {
  return {
    name: input.name,
    notes: input.notes ?? null,
    sentenceIds: input.sentenceIds ?? [],
    mySentenceIds: input.mySentenceIds ?? [],
  };
}

/** List shadowing lists, newest first. */
export async function listShadowingLists(): Promise<ShadowingList[]> {
  const rows = await db.select().from(shadowingLists).orderBy(desc(shadowingLists.createdAt));
  return rows.map(toShadowingList);
}

export async function getShadowingList(id: string): Promise<ShadowingList | null> {
  const [row] = await db.select().from(shadowingLists).where(eq(shadowingLists.id, id));
  return row ? toShadowingList(row) : null;
}

export async function createShadowingList(
  input: CreateShadowingListInput,
): Promise<ShadowingList> {
  const [row] = await db.insert(shadowingLists).values(toInsert(input)).returning();
  return toShadowingList(row);
}

export async function updateShadowingList(
  id: string,
  input: UpdateShadowingListInput,
): Promise<ShadowingList | null> {
  const [row] = await db
    .update(shadowingLists)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(shadowingLists.id, id))
    .returning();
  return row ? toShadowingList(row) : null;
}

export async function deleteShadowingList(id: string): Promise<boolean> {
  const rows = await db.delete(shadowingLists).where(eq(shadowingLists.id, id)).returning({
    id: shadowingLists.id,
  });
  return rows.length > 0;
}
