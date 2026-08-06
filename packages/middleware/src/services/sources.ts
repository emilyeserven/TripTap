import { asc } from "drizzle-orm";
import type { CreateSourceInput, Source } from "@sentence-bank/types";
import { sources, type SourceRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `Source` wire type. */
function toSource(row: SourceRow): Source {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    author: row.author,
    url: row.url,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
  };
}

/** Drizzle insert shape for one source row, from the create input. */
function toInsert(input: CreateSourceInput) {
  return {
    name: input.name,
    type: input.type ?? null,
    author: input.author ?? null,
    url: input.url ?? null,
    notes: input.notes ?? null,
  };
}

// `sources` is the one adopting table with no `updated_at` column, so nothing to stamp.
const crud = crudService(sources, {
  toWire: toSource,
  toInsert,
  orderBy: [asc(sources.name)],
  touchUpdatedAt: false,
});

/** List sources, alphabetically by name. */
export const listSources = crud.list;
export const createSource = crud.create;
export const updateSource = crud.update;
export const deleteSource = crud.remove;
