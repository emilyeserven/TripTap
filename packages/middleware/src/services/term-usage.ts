import { desc, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { TermUsage, TermUsageKind, TermUsageSummary } from "@sentence-bank/types";

import { db } from "@/db";
import {
  aiLessonGrammar,
  aiLessonSourceSentences,
  listeningSessions,
  mySentences,
  practiceSentences,
  questionSheets,
  sentences,
  shadowingSessions,
  writings,
} from "@/db/schema";

/**
 * "Everything tagged with this term", across every table that stores term refs.
 *
 * Term refs live as denormalized JSONB rather than in a join table, so each source is a containment
 * query (`column @> [{"id": …}]`) — which the GIN indexes added alongside this service serve. The
 * per-source shape differs only in which columns supply the title/subtitle, so each source is
 * declared once in {@link SOURCES} rather than written out as its own function.
 */

/** A jsonb term-ref column contains the given term id. */
function hasTerm(column: AnyPgColumn, termId: string) {
  return sql`${column} @> ${JSON.stringify([{
    id: termId,
  }])}::jsonb`;
}

interface UsageSource {
  kind: TermUsageKind;
  /** Runs the containment query and maps rows to usages. */
  find: (termId: string) => Promise<TermUsage[]>;
}

/** Build a source whose rows map to (title, subtitle) via the given columns. */
function source<T extends Record<string, unknown>>(
  kind: TermUsageKind,
  find: (termId: string) => Promise<T[]>,
  map: (row: T) => { title: string;
    subtitle: string | null; },
  incorrect = false,
): UsageSource {
  return {
    kind,
    find: async (termId) => {
      const rows = await find(termId);
      return rows
        .map((row) => {
          const {
            title, subtitle,
          } = map(row);
          return {
            kind,
            id: String(row.id),
            title,
            subtitle,
            incorrect,
          };
        })
        .filter(u => u.title.trim().length > 0);
    },
  };
}

const SOURCES: UsageSource[] = [
  source(
    "sentence",
    termId => db.select({
      id: sentences.id,
      text: sentences.text,
      translation: sentences.translation,
    }).from(sentences).where(hasTerm(sentences.terms, termId)).orderBy(desc(sentences.createdAt)),
    r => ({
      title: r.text,
      subtitle: r.translation,
    }),
  ),
  source(
    "my_sentence",
    termId => db.select({
      id: mySentences.id,
      text: mySentences.text,
      correction: mySentences.correction,
      translation: mySentences.translation,
    }).from(mySentences).where(hasTerm(mySentences.terms, termId)).orderBy(desc(mySentences.createdAt)),
    // Show the corrected form when there is one — that's the sentence the learner should re-read.
    r => ({
      title: r.correction?.trim() ? r.correction : r.text,
      subtitle: r.translation,
    }),
  ),
  source(
    "my_sentence",
    termId => db.select({
      id: mySentences.id,
      text: mySentences.text,
      translation: mySentences.translation,
    }).from(mySentences).where(hasTerm(mySentences.incorrectGrammarTerms, termId)).orderBy(desc(mySentences.createdAt)),
    // The misuse is the point here, so show it as written, never the correction.
    r => ({
      title: r.text,
      subtitle: r.translation,
    }),
    true,
  ),
  source(
    "practice_sentence",
    termId => db.select({
      id: practiceSentences.id,
      text: practiceSentences.text,
      translation: practiceSentences.translation,
    }).from(practiceSentences).where(hasTerm(practiceSentences.terms, termId)).orderBy(desc(practiceSentences.createdAt)),
    r => ({
      title: r.text,
      subtitle: r.translation,
    }),
  ),
  source(
    "writing",
    termId => db.select({
      id: writings.id,
      date: writings.date,
      text: writings.text,
    }).from(writings).where(hasTerm(writings.terms, termId)).orderBy(desc(writings.date)),
    r => ({
      title: r.text.split("\n")[0] ?? "",
      subtitle: r.date,
    }),
  ),
  source(
    "question_sheet",
    termId => db.select({
      id: questionSheets.id,
      title: questionSheets.title,
    }).from(questionSheets).where(hasTerm(questionSheets.grammarTerms, termId)).orderBy(desc(questionSheets.createdAt)),
    r => ({
      title: r.title ?? "",
      subtitle: null,
    }),
  ),
  source(
    "listening_session",
    termId => db.select({
      id: listeningSessions.id,
      title: listeningSessions.title,
      date: listeningSessions.date,
    }).from(listeningSessions).where(hasTerm(listeningSessions.terms, termId)).orderBy(desc(listeningSessions.date)),
    r => ({
      title: r.title,
      subtitle: r.date,
    }),
  ),
  source(
    "shadowing_session",
    termId => db.select({
      id: shadowingSessions.id,
      title: shadowingSessions.title,
      date: shadowingSessions.date,
    }).from(shadowingSessions).where(hasTerm(shadowingSessions.terms, termId)).orderBy(desc(shadowingSessions.date)),
    r => ({
      title: r.title,
      subtitle: r.date,
    }),
  ),
  source(
    "ai_lesson_grammar",
    termId => db.select({
      id: aiLessonGrammar.id,
      pat: aiLessonGrammar.pat,
      gloss: aiLessonGrammar.gloss,
    }).from(aiLessonGrammar).where(hasTerm(aiLessonGrammar.grammarTerms, termId)),
    r => ({
      title: r.pat,
      subtitle: r.gloss,
    }),
  ),
  source(
    "ai_lesson_sentence",
    termId => db.select({
      id: aiLessonSourceSentences.id,
      jp: aiLessonSourceSentences.jp,
      en: aiLessonSourceSentences.en,
    }).from(aiLessonSourceSentences).where(hasTerm(aiLessonSourceSentences.grammarTerms, termId)),
    r => ({
      title: r.jp,
      subtitle: r.en,
    }),
  ),
];

/** Everything tagged with `termId`, across every feature that stores term refs. */
export async function getTermUsages(termId: string): Promise<TermUsageSummary> {
  const results = await Promise.all(SOURCES.map(s => s.find(termId)));
  const usages = results.flat();
  return {
    termId,
    total: usages.length,
    usages,
  };
}
