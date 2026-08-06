import { asc } from "drizzle-orm";
import type { CreateSourceInput, Source, UpdateSourceInput } from "@sentence-bank/types";
import { wouldCreateSourceCycle } from "@sentence-bank/types";
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
    parentId: row.parentId,
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
    parentId: input.parentId ?? null,
  };
}

// `sources` is the one adopting table with no `updated_at` column, so nothing to stamp.
const crud = crudService(sources, {
  toWire: toSource,
  toInsert,
  orderBy: [asc(sources.name)],
  touchUpdatedAt: false,
});

/**
 * Thrown when the requested `parentId` can't be used: it names no source, or nesting under it would
 * close a loop (a source under itself, or under one of its own descendants). The route turns this
 * into a 400 — the self-referencing FK constrains a single hop, never the whole path.
 */
export class InvalidSourceParentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSourceParentError";
  }
}

/** List sources, alphabetically by name. */
export const listSources = crud.list;
export const getSource = crud.get;
export const deleteSource = crud.remove;

/**
 * Check a proposed parent before it reaches the insert/update.
 *
 * Reading the whole table is fine at this scale (a personal taxonomy of tens of rows) and is the
 * only way to see the full ancestor chain. `id` is null when creating, where a cycle is impossible
 * and only the parent's existence matters.
 */
async function assertUsableParent(id: string | null, parentId: string | null): Promise<void> {
  if (!parentId) return;
  const all = await listSources();
  if (!all.some(s => s.id === parentId)) {
    throw new InvalidSourceParentError("Parent source not found");
  }
  if (id && wouldCreateSourceCycle(all, id, parentId)) {
    throw new InvalidSourceParentError(
      "A source cannot be nested inside itself or one of its own sub-sources",
    );
  }
}

/** Create a source, rejecting a `parentId` that names no source. */
export async function createSource(input: CreateSourceInput): Promise<Source> {
  await assertUsableParent(null, input.parentId ?? null);
  return crud.create(input);
}

/** Patch a source, rejecting a `parentId` that is unknown or would create a cycle. */
export async function updateSource(
  id: string,
  input: UpdateSourceInput,
): Promise<Source | null> {
  if (input.parentId !== undefined) await assertUsableParent(id, input.parentId ?? null);
  return crud.update(id, input);
}
