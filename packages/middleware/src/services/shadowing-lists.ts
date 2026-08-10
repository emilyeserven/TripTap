import { desc, eq } from "drizzle-orm";
import type {
  CreateShadowingListInput,
  ShadowingList,
  UpdateShadowingListInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { shadowingLists, type ShadowingListRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/**
 * Membership is one id array into the unified sentences table (any kind). The wire type still
 * carries the legacy `mySentenceIds` split: reads return it empty (everything lives in
 * `sentenceIds` now), and writes union it into the one array, which keeps every pre-merge client
 * flow correct — adds arrive via either field, removals always send the full merged `sentenceIds`.
 * The field disappears from the wire type once the client speaks unified sentences.
 */

/** Map a DB row to the shared `ShadowingList` wire type. */
function toShadowingList(row: ShadowingListRow): ShadowingList {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    sentenceIds: row.sentenceIds ?? [],
    mySentenceIds: [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** One deduped membership array from the legacy two-array input shape. */
function mergedIds(sentenceIds: string[], mySentenceIds: string[]): string[] {
  return [...new Set([...sentenceIds, ...mySentenceIds])];
}

/** Drizzle insert shape for one shadowing-list row, from the create input. */
function toInsert(input: CreateShadowingListInput) {
  return {
    name: input.name,
    notes: input.notes ?? null,
    sentenceIds: mergedIds(input.sentenceIds ?? [], input.mySentenceIds ?? []),
  };
}

const crud = crudService(shadowingLists, {
  toWire: toShadowingList,
  toInsert,
  orderBy: [desc(shadowingLists.createdAt)],
});

/** List shadowing lists, newest first. */
export const listShadowingLists = crud.list;
export const getShadowingList = crud.get;
export const createShadowingList = crud.create;
export const deleteShadowingList = crud.remove;

/**
 * Patch one list. Membership updates fold the legacy split into the one array: a provided
 * `sentenceIds` replaces the membership (it's always the full merged set on the wire), and a
 * provided `mySentenceIds` unions in — an add from the legacy My Sentences flow, which never sees
 * the merged array it would otherwise clobber.
 */
export async function updateShadowingList(
  id: string,
  input: UpdateShadowingListInput,
): Promise<ShadowingList | null> {
  const {
    sentenceIds, mySentenceIds, ...rest
  } = input;
  let membership: string[] | undefined;
  if (sentenceIds !== undefined || mySentenceIds !== undefined) {
    const [existing] = await db
      .select({
        sentenceIds: shadowingLists.sentenceIds,
      })
      .from(shadowingLists)
      .where(eq(shadowingLists.id, id));
    if (!existing) return null;
    membership = mergedIds(
      sentenceIds ?? existing.sentenceIds ?? [],
      mySentenceIds ?? [],
    );
  }
  const [row] = await db
    .update(shadowingLists)
    .set({
      ...rest,
      ...(membership !== undefined
        ? {
          sentenceIds: membership,
        }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(shadowingLists.id, id))
    .returning();
  return row ? toShadowingList(row) : null;
}
