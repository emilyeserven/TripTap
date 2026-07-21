import type { DrillMistake, DrillSession } from "@sentence-bank/types";

import { todayDateString } from "@/lib/daily-lineup";

/**
 * Recurring-mistake detection for drill sessions. A "mistake" is identified by its **question** text:
 * if the same question shows up across several recent drill sessions, the learner keeps getting the
 * same thing wrong and should practise it (write a sentence with it, look up collocations). The
 * question is the identity — the answer they gave varies, but the question being asked is the mistake.
 */

/** How many days back counts as "recent" (the trailing window, including today). */
export const RECURRENCE_DAYS = 7;
/** How many distinct sessions a question must appear in (within the window) to be flagged. */
export const RECURRENCE_MIN_SESSIONS = 3;

/** Normalize a question for grouping: trimmed and case-folded (harmless for Japanese). Empty → null. */
export function normalizeQuestion(question: string | null | undefined): string | null {
  const trimmed = (question ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** One question the learner has missed across multiple recent sessions. */
export interface RecurringQuestion {
  /** Normalized grouping key. */
  key: string;
  /** Representative display text (the most recent occurrence's original question). */
  question: string;
  /** Number of distinct sessions (within the window) whose mistakes include this question. */
  sessionCount: number;
  /** The most recent mistake with this question, for seeding the "Add sentence" / "Find examples" actions. */
  sample: DrillMistake;
}

/**
 * Map of normalized question → how many distinct recent sessions it appears in, for every question
 * seen in the window (not just the flagged ones). Consumers threshold it themselves — the mistake card
 * looks up its own question, the stats callout filters to {@link RECURRENCE_MIN_SESSIONS}+.
 */
export function recurringQuestions(
  sessions: DrillSession[],
  now: Date,
  days: number = RECURRENCE_DAYS,
): Map<string, RecurringQuestion> {
  const cutoff = todayDateString(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
  const sessionIds = new Map<string, Set<string>>();
  const samples = new Map<string, { date: string;
    mistake: DrillMistake; }>();

  for (const session of sessions) {
    if (session.date < cutoff) continue;
    for (const mistake of session.mistakes ?? []) {
      const key = normalizeQuestion(mistake.question);
      if (!key) continue;
      const ids = sessionIds.get(key) ?? new Set<string>();
      ids.add(session.id);
      sessionIds.set(key, ids);
      // Keep the most recent occurrence (by session date) as the representative sample.
      const prev = samples.get(key);
      if (!prev || session.date >= prev.date) {
        samples.set(key, {
          date: session.date,
          mistake,
        });
      }
    }
  }

  const out = new Map<string, RecurringQuestion>();
  for (const [key, ids] of sessionIds) {
    const sample = samples.get(key);
    if (!sample) continue;
    out.set(key, {
      key,
      question: sample.mistake.question ?? "",
      sessionCount: ids.size,
      sample: sample.mistake,
    });
  }
  return out;
}

/** The flagged questions (appearing in `min`+ distinct recent sessions), most-frequent first. */
export function flaggedRecurringQuestions(
  sessions: DrillSession[],
  now: Date,
  days: number = RECURRENCE_DAYS,
  min: number = RECURRENCE_MIN_SESSIONS,
): RecurringQuestion[] {
  return [...recurringQuestions(sessions, now, days).values()]
    .filter(r => r.sessionCount >= min)
    .sort((a, b) => b.sessionCount - a.sessionCount || a.question.localeCompare(b.question));
}
