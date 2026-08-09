import { asc } from "drizzle-orm";
import type {
  CreateCultureTopicInput,
  CultureTopic,
} from "@sentence-bank/types";
import { cultureTopics, type CultureTopicRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `CultureTopic` wire type. */
function toCultureTopic(row: CultureTopicRow): CultureTopic {
  return {
    id: row.id,
    name: row.name,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one topic row, from the create input. */
function toInsert(input: CreateCultureTopicInput) {
  return {
    name: input.name,
  };
}

const crud = crudService(cultureTopics, {
  toWire: toCultureTopic,
  toInsert,
  orderBy: [asc(cultureTopics.name)],
});

/** List culture topics, alphabetically by name. */
export const listCultureTopics = crud.list;
export const getCultureTopic = crud.get;
export const createCultureTopic = crud.create;
export const updateCultureTopic = crud.update;
export const deleteCultureTopic = crud.remove;
