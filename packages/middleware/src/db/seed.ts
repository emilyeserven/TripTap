import { db } from "@/db";
import { sentences } from "@/db/schema";

/**
 * Seed a sample sentence when the table is empty. Skipped in production so real
 * deployments start clean. Useful for local `pnpm dev`.
 */
export async function maybeSeed(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const [existing] = await db.select({
    id: sentences.id,
  }).from(sentences).limit(1);
  if (existing) return;

  await db.insert(sentences).values({
    text: "毎朝コーヒーを飲みます。",
    translation: "I drink coffee every morning.",
    language: "Japanese",
    source: "Genki I, Lesson 3",
    notes: "Uses the ます-form for a habitual action.",
    tags: "verbs, routine",
  });
}
