import { desc } from "drizzle-orm";
import type {
  CreateParseTemplateInput,
  ParseBoundary,
  ParseTarget,
  ParseTemplate,
} from "@sentence-bank/types";
import { parseTemplates, type ParseTemplateRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

function toTemplate(row: ParseTemplateRow): ParseTemplate {
  return {
    id: row.id,
    name: row.name,
    target: row.target as ParseTarget,
    body: row.body,
    boundary: row.boundary as ParseBoundary,
    ignoreBlankLines: row.ignoreBlankLines,
    createdAt: toIso(row.createdAt),
  };
}

// No `updated_at` column, and no update route — templates are created and deleted, never edited.
const crud = crudService(parseTemplates, {
  toWire: toTemplate,
  toInsert: (input: CreateParseTemplateInput) => ({
    name: input.name,
    target: input.target,
    body: input.body,
    boundary: input.boundary,
    ignoreBlankLines: input.ignoreBlankLines,
  }),
  orderBy: [desc(parseTemplates.createdAt)],
  touchUpdatedAt: false,
});

export const listParseTemplates = crud.list;
export const createParseTemplate = crud.create;
export const deleteParseTemplate = crud.remove;
