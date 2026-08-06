import { asc } from "drizzle-orm";
import type {
  CreateDrillReasonCategoryInput,
  DrillReasonCategory,
} from "@sentence-bank/types";
import { drillReasonCategories, type DrillReasonCategoryRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `DrillReasonCategory` wire type. */
function toDrillReasonCategory(row: DrillReasonCategoryRow): DrillReasonCategory {
  return {
    id: row.id,
    name: row.name,
    subcategories: row.subcategories ?? null,
    reasons: row.reasons ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one reason-category row, from the create input. */
function toInsert(input: CreateDrillReasonCategoryInput) {
  return {
    name: input.name,
    subcategories: input.subcategories ?? null,
    reasons: input.reasons ?? null,
  };
}

const crud = crudService(drillReasonCategories, {
  toWire: toDrillReasonCategory,
  toInsert,
  orderBy: [asc(drillReasonCategories.name)],
});

/** List reason categories, alphabetically by name. */
export const listDrillReasonCategories = crud.list;
export const getDrillReasonCategory = crud.get;
export const createDrillReasonCategory = crud.create;
export const updateDrillReasonCategory = crud.update;
export const deleteDrillReasonCategory = crud.remove;
