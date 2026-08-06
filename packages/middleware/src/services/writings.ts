import { desc } from "drizzle-orm";
import type {
  CreateWritingInput,
  Writing,
} from "@sentence-bank/types";
import { writings, type WritingRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `Writing` wire type. */
function toWriting(row: WritingRow): Writing {
  return {
    id: row.id,
    date: row.date,
    text: row.text,
    meaning: row.meaning,
    comments: row.comments,
    language: row.language,
    readyToReview: row.readyToReview,
    terms: row.terms ?? null,
    corrections: row.corrections ?? null,
    promptTitle: row.promptTitle ?? null,
    promptText: row.promptText ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one writing row, from the create input. */
function toInsert(input: CreateWritingInput) {
  return {
    date: input.date,
    text: input.text,
    meaning: input.meaning ?? null,
    comments: input.comments ?? null,
    language: input.language,
    readyToReview: input.readyToReview ?? false,
    terms: input.terms ?? null,
    corrections: input.corrections ?? null,
    promptTitle: input.promptTitle ?? null,
    promptText: input.promptText ?? null,
  };
}

const crud = crudService(writings, {
  toWire: toWriting,
  toInsert,
  orderBy: [desc(writings.date), desc(writings.createdAt)],
});

/** List writings, most recent date first. */
export const listWritings = crud.list;
export const getWriting = crud.get;
export const createWriting = crud.create;
export const updateWriting = crud.update;
export const deleteWriting = crud.remove;
