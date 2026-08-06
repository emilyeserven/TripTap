import { desc } from "drizzle-orm";
import type {
  CreateWritingPromptInput,
  WritingPrompt,
  WritingPromptDifficulty,
} from "@sentence-bank/types";
import { writingPrompts, type WritingPromptRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `WritingPrompt` wire type. */
function toWritingPrompt(row: WritingPromptRow): WritingPrompt {
  return {
    id: row.id,
    title: row.title ?? null,
    titleEn: row.titleEn ?? null,
    text: row.text,
    textEn: row.textEn ?? null,
    difficulty: (row.difficulty as WritingPromptDifficulty) ?? "Other",
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one writing-prompt row, from the create input. */
function toInsert(input: CreateWritingPromptInput) {
  return {
    title: input.title ?? null,
    titleEn: input.titleEn ?? null,
    text: input.text,
    textEn: input.textEn ?? null,
    difficulty: input.difficulty ?? "Other",
  };
}

const crud = crudService(writingPrompts, {
  toWire: toWritingPrompt,
  toInsert,
  orderBy: [desc(writingPrompts.createdAt)],
});

/** List writing prompts, newest first. */
export const listWritingPrompts = crud.list;
export const getWritingPrompt = crud.get;
export const createWritingPrompt = crud.create;
/** Create many writing prompts in a single insert (used by the bulk-paste import flow). */
export const createWritingPromptsMany = crud.createMany;
export const updateWritingPrompt = crud.update;
export const deleteWritingPrompt = crud.remove;
