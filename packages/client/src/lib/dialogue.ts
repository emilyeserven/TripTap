/**
 * Presentation helpers for dialogue transcripts. The parsing itself lives in `@sentence-bank/types`
 * so the API and the client agree on what a line is; everything here is about how a speaker *looks*.
 */

/**
 * Avatar colours for non-self speakers. Chosen so a three- or four-person scene stays legible in both
 * themes without any speaker reading as the learner's own (primary-coloured) side.
 */
const SPEAKER_ACCENTS = [
  "bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
  "bg-violet-100 text-violet-900 dark:bg-violet-900 dark:text-violet-100",
  "bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100",
  "bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-100",
];

/**
 * Pick a speaker's avatar colour from their label, so the same character keeps the same colour every
 * time the dialogue is opened (and across dialogues) without anything being stored.
 */
export function speakerAccent(speaker: string | null): string {
  if (!speaker) return "bg-muted text-muted-foreground";
  let hash = 0;
  for (const char of speaker) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 100_000_007;
  return SPEAKER_ACCENTS[hash % SPEAKER_ACCENTS.length];
}

/**
 * The character shown in a speaker's avatar. Uses the first *code point* so a name starting with a
 * kanji or an emoji isn't split into half a surrogate pair.
 */
export function speakerInitial(speaker: string | null): string {
  if (!speaker) return "•";
  const [first] = [...speaker.trim()];
  return first ?? "•";
}
