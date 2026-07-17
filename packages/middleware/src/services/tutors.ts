import { asc, eq } from "drizzle-orm";
import type {
  CreateTutorInput,
  Tutor,
  UpdateTutorInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { tutors, type TutorRow } from "@/db/schema";

/** Map a DB row to the shared `Tutor` wire type. */
function toTutor(row: TutorRow): Tutor {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/** Drizzle insert shape for one tutor row, from the create input. */
function toInsert(input: CreateTutorInput) {
  return {
    name: input.name,
    notes: input.notes ?? null,
  };
}

/** List tutors, alphabetically by name. */
export async function listTutors(): Promise<Tutor[]> {
  const rows = await db.select().from(tutors).orderBy(asc(tutors.name));
  return rows.map(toTutor);
}

export async function getTutor(id: string): Promise<Tutor | null> {
  const [row] = await db.select().from(tutors).where(eq(tutors.id, id));
  return row ? toTutor(row) : null;
}

export async function createTutor(input: CreateTutorInput): Promise<Tutor> {
  const [row] = await db.insert(tutors).values(toInsert(input)).returning();
  return toTutor(row);
}

export async function updateTutor(
  id: string,
  input: UpdateTutorInput,
): Promise<Tutor | null> {
  const [row] = await db
    .update(tutors)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(tutors.id, id))
    .returning();
  return row ? toTutor(row) : null;
}

export async function deleteTutor(id: string): Promise<boolean> {
  const rows = await db.delete(tutors).where(eq(tutors.id, id)).returning({
    id: tutors.id,
  });
  return rows.length > 0;
}
