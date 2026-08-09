/**
 * The Kanji index: which characters the learner has actually met, how often, and in what.
 *
 * Everything except the learner's self-assigned status is **derived on read** by scanning the
 * text-bearing tables — the same principle as XP (`services/xp.ts`), and for the same reason: a
 * stored count silently drifts from the corpus it claims to describe, while a derived one cannot.
 *
 * **Caching.** The scan is six `select`s of three columns each; on a single-user personal database
 * that is milliseconds, so there is no materialized view and no SQL-side aggregation here. What there
 * *is* is a very short TTL memo, purely to absorb the burst of requests a single page view produces
 * (the grid, then a detail page, then a React Query refetch) without re-scanning for each. The window
 * is deliberately short enough that a freshly-added sentence shows up on the next navigation. If the
 * corpus ever outgrows this, move the aggregation into SQL — don't lengthen the TTL.
 */

import { asc, eq } from "drizzle-orm";
import type {
  DialogueLine,
  KanjiDetail,
  KanjiListQuery,
  KanjiStatus,
  KanjiSummary,
  UpdateKanjiStatusInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import {
  dialogues,
  kanjiStatus,
  mySentences,
  practiceSentences,
  sentences,
  vocab,
  writings,
} from "@/db/schema";
import { toIso } from "@/services/rows";
import { indexKanji, type KanjiAggregate, type KanjiSourceItem } from "@/services/kanji/extract";

/** How long a built index is reused before the corpus is re-scanned. See the caching note above. */
const INDEX_TTL_MS = 5_000;

let cached: { at: number;
  index: Map<string, KanjiAggregate>; } | null = null;

/** Drop the memo. Exported for tests, and for any future write path that must be visible at once. */
export function invalidateKanjiIndex(): void {
  cached = null;
}

/** Join a vocab entry's reading and meaning into the one-line gloss the UI shows. */
function vocabGloss(reading: string | null, meaning: string | null): string | null {
  return [reading, meaning].filter(Boolean).join(" — ") || null;
}

/**
 * The indexable text of a dialogue: its parsed lines, **not** the raw script.
 *
 * The script repeats the speaker label on every turn (`田中さん：…`), so indexing it would credit
 * 田 and 中 once per line and rank a speaker's name above words the learner actually studied.
 * `DialogueLine.text` already has the label and separator stripped by the shared parser in
 * `types/src/dialogue.ts`. Falls back to the script when a row predates parsing (`lines` null).
 */
function dialogueText(lines: DialogueLine[] | null, script: string): string {
  if (!lines || lines.length === 0) return script;
  return lines.map(l => l.text).join("\n");
}

/**
 * Load every text-bearing row as a normalized {@link KanjiSourceItem}.
 *
 * Only the columns the index needs are selected — the corpus includes free writing and dialogue
 * scripts, so pulling whole rows would move far more text than necessary. The six queries run
 * concurrently; they're independent.
 */
async function loadSourceItems(): Promise<KanjiSourceItem[]> {
  const [
    sentenceRows,
    mySentenceRows,
    practiceRows,
    vocabRows,
    dialogueRows,
    writingRows,
  ] = await Promise.all([
    db.select({
      id: sentences.id,
      text: sentences.text,
      reading: sentences.reading,
      gloss: sentences.translation,
      createdAt: sentences.createdAt,
    }).from(sentences),
    db.select({
      id: mySentences.id,
      text: mySentences.text,
      correction: mySentences.correction,
      reading: mySentences.reading,
      gloss: mySentences.translation,
      createdAt: mySentences.createdAt,
    }).from(mySentences),
    db.select({
      id: practiceSentences.id,
      text: practiceSentences.text,
      reading: practiceSentences.reading,
      gloss: practiceSentences.translation,
      createdAt: practiceSentences.createdAt,
    }).from(practiceSentences),
    db.select({
      id: vocab.id,
      text: vocab.term,
      reading: vocab.reading,
      meaning: vocab.meaning,
      createdAt: vocab.createdAt,
    }).from(vocab),
    db.select({
      id: dialogues.id,
      script: dialogues.script,
      lines: dialogues.lines,
      gloss: dialogues.title,
      createdAt: dialogues.createdAt,
    }).from(dialogues),
    db.select({
      id: writings.id,
      text: writings.text,
      gloss: writings.meaning,
      createdAt: writings.createdAt,
    }).from(writings),
  ]);

  return [
    ...sentenceRows.map(r => ({
      kind: "sentence" as const,
      id: r.id,
      text: r.text,
      reading: r.reading ?? null,
      gloss: r.gloss,
      createdAt: toIso(r.createdAt),
    })),
    // Index the corrected form when there is one, never both: the learner's original may contain a
    // wrong kanji they should not be credited with having "met", and the correction is the sentence
    // they should re-read. (`services/term-usage.ts` resolves the same fork the same way.)
    ...mySentenceRows.map(r => ({
      kind: "my-sentence" as const,
      id: r.id,
      text: r.correction ?? r.text,
      // The stored furigana describes `text`, so it only aligns when no correction replaced it.
      reading: r.correction ? null : r.reading ?? null,
      gloss: r.gloss,
      createdAt: toIso(r.createdAt),
    })),
    ...practiceRows.map(r => ({
      kind: "practice" as const,
      id: r.id,
      text: r.text,
      reading: r.reading ?? null,
      gloss: r.gloss,
      createdAt: toIso(r.createdAt),
    })),
    // `vocab.reading` is a plain string, not furigana tokens, so it folds into the gloss instead.
    ...vocabRows.map(r => ({
      kind: "vocab" as const,
      id: r.id,
      text: r.text,
      reading: null,
      gloss: vocabGloss(r.reading, r.meaning),
      createdAt: toIso(r.createdAt),
    })),
    ...dialogueRows.map(r => ({
      kind: "dialogue" as const,
      id: r.id,
      text: dialogueText(r.lines, r.script),
      reading: null,
      gloss: r.gloss,
      createdAt: toIso(r.createdAt),
    })),
    ...writingRows.map(r => ({
      kind: "writing" as const,
      id: r.id,
      text: r.text,
      reading: null,
      gloss: r.gloss,
      createdAt: toIso(r.createdAt),
    })),
  ];
}

/** The derived index, from the memo when it's fresh enough. */
async function getIndex(): Promise<Map<string, KanjiAggregate>> {
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return cached.index;
  const index = indexKanji(await loadSourceItems());
  cached = {
    at: Date.now(),
    index,
  };
  return index;
}

/** Every character the learner has marked, as `char → row`. Characters never marked are absent. */
async function loadStatuses(): Promise<Map<string, { status: KanjiStatus;
  note: string | null; }>> {
  const rows = await db.select().from(kanjiStatus);
  return new Map(rows.map(r => [r.char, {
    status: r.status,
    note: r.note,
  }]));
}

/** Project an aggregate to the wire summary, folding in the learner's status (default `new`). */
function toSummary(agg: KanjiAggregate, status: KanjiStatus): KanjiSummary {
  return {
    char: agg.char,
    occurrences: agg.occurrences,
    itemCount: agg.itemCount,
    kindCounts: agg.kindCounts,
    firstSeenAt: agg.firstSeenAt,
    lastSeenAt: agg.lastSeenAt,
    status,
  };
}

/** Order the grid. `occurrences` and `recent` both fall back to the character so ties are stable. */
function sortSummaries(rows: KanjiSummary[], sort: KanjiListQuery["sort"]): KanjiSummary[] {
  const byChar = (a: KanjiSummary, b: KanjiSummary) => a.char.localeCompare(b.char);
  if (sort === "char") return rows.sort(byChar);
  if (sort === "recent") {
    return rows.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt) || byChar(a, b));
  }
  return rows.sort((a, b) => b.occurrences - a.occurrences || byChar(a, b));
}

/**
 * The kanji grid: every character in the corpus, filtered and ordered.
 *
 * Characters the learner has marked but that no longer appear anywhere (the sentence that taught
 * them was deleted) are intentionally omitted — the grid describes the corpus, not the status table.
 */
export async function listKanji(query: KanjiListQuery = {}): Promise<KanjiSummary[]> {
  const [index, statuses] = await Promise.all([getIndex(), loadStatuses()]);

  const rows: KanjiSummary[] = [];
  for (const agg of index.values()) {
    const status = statuses.get(agg.char)?.status ?? "new";
    if (query.status && status !== query.status) continue;
    if (query.kind && agg.kindCounts[query.kind] === 0) continue;
    if (query.minOccurrences != null && agg.occurrences < query.minOccurrences) continue;
    rows.push(toSummary(agg, status));
  }

  return sortSummaries(rows, query.sort);
}

/** One character with every item it appears in, or null when it appears nowhere in the corpus. */
export async function getKanjiDetail(char: string): Promise<KanjiDetail | null> {
  const [index, statuses] = await Promise.all([getIndex(), loadStatuses()]);
  const agg = index.get(char);
  if (!agg) return null;

  const marked = statuses.get(char);
  return {
    ...toSummary(agg, marked?.status ?? "new"),
    note: marked?.note ?? null,
    items: agg.items,
  };
}

/**
 * Set the learner's status (and optionally note) for a character.
 *
 * Upserts, because `new` characters have no row until they're first marked. `note` is tri-state:
 * omitting it leaves whatever is stored, `null` clears it.
 */
export async function setKanjiStatus(
  char: string,
  input: UpdateKanjiStatusInput,
): Promise<{ char: string;
  status: KanjiStatus;
  note: string | null; }> {
  const [row] = await db.insert(kanjiStatus).values({
    char,
    status: input.status,
    note: input.note ?? null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: kanjiStatus.char,
    set: {
      status: input.status,
      updatedAt: new Date(),
      ...(input.note === undefined
        ? {}
        : {
          note: input.note,
        }),
    },
  }).returning();

  return {
    char: row.char,
    status: row.status,
    note: row.note,
  };
}

/** Every character the learner has ever marked, alphabetically — the Profile-style progress list. */
export async function listMarkedKanji(): Promise<{ char: string;
  status: KanjiStatus;
  note: string | null; }[]> {
  const rows = await db.select().from(kanjiStatus).orderBy(asc(kanjiStatus.char));
  return rows.map(r => ({
    char: r.char,
    status: r.status,
    note: r.note,
  }));
}

/** Delete a character's status row, returning it to the implicit `new` state. */
export async function clearKanjiStatus(char: string): Promise<boolean> {
  const deleted = await db.delete(kanjiStatus).where(eq(kanjiStatus.char, char)).returning();
  return deleted.length > 0;
}
