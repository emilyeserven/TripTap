import { asc } from "drizzle-orm";
import type {
  CreateTutorInput,
  Tutor,
} from "@sentence-bank/types";
import { tutors, type TutorRow } from "@/db/schema";
import { crudService } from "@/services/crud";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `Tutor` wire type. */
function toTutor(row: TutorRow): Tutor {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Drizzle insert shape for one tutor row, from the create input. */
function toInsert(input: CreateTutorInput) {
  return {
    name: input.name,
    notes: input.notes ?? null,
  };
}

const crud = crudService(tutors, {
  toWire: toTutor,
  toInsert,
  orderBy: [asc(tutors.name)],
});

/** List tutors, alphabetically by name. */
export const listTutors = crud.list;
export const getTutor = crud.get;
export const createTutor = crud.create;
export const updateTutor = crud.update;
export const deleteTutor = crud.remove;
