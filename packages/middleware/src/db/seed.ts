import { readFileSync } from "node:fs";
import { aiLessonImportSchema } from "@sentence-bank/types";
import { db } from "@/db";
import { aiLessons, sentences } from "@/db/schema";
import { createAiLessonFromImport } from "@/services/ai-lessons";

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

/** The reference AI Lessons shipped as importable fixtures, seeded in dev. */
const AI_LESSON_FIXTURES = [
  "hagi-ai-lesson.json",
  "mihagi-ai-lesson.json",
  "ghost-in-the-shell-ai-lesson.json",
] as const;

/**
 * Seed the reference AI Lessons in dev. Each fixture doubles as the contract's ground-truth example, so
 * we validate on the way in and import any whose slug isn't already present (idempotent).
 */
export async function maybeSeedAiLessons(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const existing = await db.select({
    slug: aiLessons.slug,
  }).from(aiLessons);
  const present = new Set(existing.map(r => r.slug));

  for (const file of AI_LESSON_FIXTURES) {
    const raw = readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8");
    const input = aiLessonImportSchema.parse(JSON.parse(raw));
    if (present.has(input.slug)) continue;
    await createAiLessonFromImport(input);
  }
}
