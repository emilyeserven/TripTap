import { db } from "@/db";
import { trips } from "@/db/schema";

/**
 * Seed a sample trip when the table is empty. Skipped in production so real
 * deployments start clean. Useful for local `pnpm dev`.
 */
export async function maybeSeed(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const [existing] = await db.select({
    id: trips.id,
  }).from(trips).limit(1);
  if (existing) return;

  await db.insert(trips).values({
    name: "Weekend in Lisbon",
    destination: "Lisbon, Portugal",
    startDate: "2026-07-10",
    endDate: "2026-07-13",
    notes: "Pastéis de nata tour and a day trip to Sintra.",
  });
}
