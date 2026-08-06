import { desc } from "drizzle-orm";
import type {
  CreateShadowingListInput,
  ShadowingList,
} from "@sentence-bank/types";
import { shadowingLists, type ShadowingListRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `ShadowingList` wire type. */
function toShadowingList(row: ShadowingListRow): ShadowingList {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    sentenceIds: row.sentenceIds ?? [],
    mySentenceIds: row.mySentenceIds ?? [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
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

const crud = crudService(shadowingLists, {
  toWire: toShadowingList,
  toInsert,
  orderBy: [desc(shadowingLists.createdAt)],
});

/** List shadowing lists, newest first. */
export const listShadowingLists = crud.list;
export const getShadowingList = crud.get;
export const createShadowingList = crud.create;
export const updateShadowingList = crud.update;
export const deleteShadowingList = crud.remove;
