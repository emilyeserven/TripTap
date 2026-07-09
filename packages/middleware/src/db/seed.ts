import { readFileSync } from "node:fs";
import { lessonImportSchema } from "@sentence-bank/types";
import { db } from "@/db";
import { lessons, sentences } from "@/db/schema";
import { createLessonFromImport } from "@/services/lessons";

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

/** The reference lessons shipped as importable fixtures, seeded in dev. */
const LESSON_FIXTURES = [
  "hagi-lesson.json",
  "mihagi-lesson.json",
  "ghost-in-the-shell-lesson.json",
] as const;

/**
 * Seed the reference lessons in dev. Each fixture doubles as the contract's ground-truth example, so
 * we validate on the way in and import any whose slug isn't already present (idempotent).
 */
export async function maybeSeedLessons(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const existing = await db.select({
    slug: lessons.slug,
  }).from(lessons);
  const present = new Set(existing.map(r => r.slug));

  for (const file of LESSON_FIXTURES) {
    const raw = readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8");
    const input = lessonImportSchema.parse(JSON.parse(raw));
    if (present.has(input.slug)) continue;
    await createLessonFromImport(input);
  }
}
