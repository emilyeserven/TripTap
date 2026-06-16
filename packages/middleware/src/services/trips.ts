import { asc, eq } from "drizzle-orm";
import type { CreateTripInput, Trip, UpdateTripInput } from "@triptap/types";
import { db } from "@/db";
import { trips, type TripRow } from "@/db/schema";

/** Map a DB row to the shared `Trip` wire type. */
function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export async function listTrips(): Promise<Trip[]> {
  const rows = await db.select().from(trips).orderBy(asc(trips.startDate));
  return rows.map(toTrip);
}

export async function getTrip(id: string): Promise<Trip | null> {
  const [row] = await db.select().from(trips).where(eq(trips.id, id));
  return row ? toTrip(row) : null;
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const [row] = await db
    .insert(trips)
    .values({
      name: input.name,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes ?? null,
    })
    .returning();
  return toTrip(row);
}

export async function updateTrip(id: string, input: UpdateTripInput): Promise<Trip | null> {
  const [row] = await db.update(trips).set(input).where(eq(trips.id, id)).returning();
  return row ? toTrip(row) : null;
}

export async function deleteTrip(id: string): Promise<boolean> {
  const rows = await db.delete(trips).where(eq(trips.id, id)).returning({
    id: trips.id,
  });
  return rows.length > 0;
}
