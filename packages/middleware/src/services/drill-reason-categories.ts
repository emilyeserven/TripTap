import { asc, eq } from "drizzle-orm";
import type {
  CreateDrillReasonCategoryInput,
  DrillReasonCategory,
  UpdateDrillReasonCategoryInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { drillReasonCategories, type DrillReasonCategoryRow } from "@/db/schema";

/** Map a DB row to the shared `DrillReasonCategory` wire type. */
function toDrillReasonCategory(row: DrillReasonCategoryRow): DrillReasonCategory {
  return {
    id: row.id,
    name: row.name,
    subcategories: row.subcategories ?? null,
    reasons: row.reasons ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
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

/** List reason categories, alphabetically by name. */
export async function listDrillReasonCategories(): Promise<DrillReasonCategory[]> {
  const rows = await db
    .select()
    .from(drillReasonCategories)
    .orderBy(asc(drillReasonCategories.name));
  return rows.map(toDrillReasonCategory);
}

export async function getDrillReasonCategory(id: string): Promise<DrillReasonCategory | null> {
  const [row] = await db
    .select()
    .from(drillReasonCategories)
    .where(eq(drillReasonCategories.id, id));
  return row ? toDrillReasonCategory(row) : null;
}

export async function createDrillReasonCategory(
  input: CreateDrillReasonCategoryInput,
): Promise<DrillReasonCategory> {
  const [row] = await db.insert(drillReasonCategories).values(toInsert(input)).returning();
  return toDrillReasonCategory(row);
}

export async function updateDrillReasonCategory(
  id: string,
  input: UpdateDrillReasonCategoryInput,
): Promise<DrillReasonCategory | null> {
  const [row] = await db
    .update(drillReasonCategories)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(drillReasonCategories.id, id))
    .returning();
  return row ? toDrillReasonCategory(row) : null;
}

export async function deleteDrillReasonCategory(id: string): Promise<boolean> {
  const rows = await db
    .delete(drillReasonCategories)
    .where(eq(drillReasonCategories.id, id))
    .returning({
      id: drillReasonCategories.id,
    });
  return rows.length > 0;
}
