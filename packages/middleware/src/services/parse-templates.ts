import { desc, eq } from "drizzle-orm";
import type {
  CreateParseTemplateInput,
  ParseBoundary,
  ParseTarget,
  ParseTemplate,
} from "@sentence-bank/types";
import { db } from "@/db";
import { parseTemplates, type ParseTemplateRow } from "@/db/schema";

function toTemplate(row: ParseTemplateRow): ParseTemplate {
  return {
    id: row.id,
    name: row.name,
    target: row.target as ParseTarget,
    body: row.body,
    boundary: row.boundary as ParseBoundary,
    ignoreBlankLines: row.ignoreBlankLines,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export async function listParseTemplates(): Promise<ParseTemplate[]> {
  const rows = await db.select().from(parseTemplates).orderBy(desc(parseTemplates.createdAt));
  return rows.map(toTemplate);
}

export async function createParseTemplate(input: CreateParseTemplateInput): Promise<ParseTemplate> {
  const [row] = await db
    .insert(parseTemplates)
    .values({
      name: input.name,
      target: input.target,
      body: input.body,
      boundary: input.boundary,
      ignoreBlankLines: input.ignoreBlankLines,
    })
    .returning();
  return toTemplate(row);
}

export async function deleteParseTemplate(id: string): Promise<boolean> {
  const rows = await db.delete(parseTemplates).where(eq(parseTemplates.id, id)).returning({
    id: parseTemplates.id,
  });
  return rows.length > 0;
}
