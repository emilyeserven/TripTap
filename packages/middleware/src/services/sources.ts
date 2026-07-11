import { asc } from "drizzle-orm";
import type { CreateSourceInput, Source } from "@sentence-bank/types";
import { db } from "@/db";
import { sources, type SourceRow } from "@/db/schema";

/** Map a DB row to the shared `Source` wire type. */
function toSource(row: SourceRow): Source {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    author: row.author,
    url: row.url,
    notes: row.notes,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export async function listSources(): Promise<Source[]> {
  const rows = await db.select().from(sources).orderBy(asc(sources.name));
  return rows.map(toSource);
}

export async function createSource(input: CreateSourceInput): Promise<Source> {
  const [row] = await db
    .insert(sources)
    .values({
      name: input.name,
      type: input.type ?? null,
      author: input.author ?? null,
      url: input.url ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toSource(row);
}
