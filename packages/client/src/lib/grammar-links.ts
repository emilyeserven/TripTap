import type {
  MySentence,
  Sentence,
  SentenceTermRef,
  SourceSentenceItem,
  WithAiLesson,
} from "@sentence-bank/types";

import { groupTermsByCategory } from "./terms";

/** A sentence linked to a grammar item because they share a Grammar source tag. */
export interface LinkedSentence {
  id: string;
  text: string;
  translation: string | null;
  /** The AI Lesson the sentence was mined from, when it is an AI Lesson source sentence. */
  aiLessonTitle?: string;
  /** True when this is one of the learner's own sentences (links to its My Sentence page). */
  mine?: boolean;
}

/** The grammar-channel term refs on a manual/bank sentence. */
export function grammarTermsOf(sentence: Sentence): SentenceTermRef[] {
  return groupTermsByCategory(sentence.terms ?? []).grammar;
}

/** Dedupe a flat list of term refs by id, sorted by name — for filter options. */
export function dedupeGrammarTags(terms: SentenceTermRef[]): SentenceTermRef[] {
  const byId = new Map<string, SentenceTermRef>();
  for (const t of terms) if (!byId.has(t.id)) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Map each grammar-tag id → the sentences (bank + AI-Lesson-mined + the learner's own) carrying that
 * tag. Used to render "Sentences using this grammar" under a grammar item that shares the tag.
 */
export function sentencesByGrammarTagId(
  manual: Sentence[],
  aiLessonSentences: WithAiLesson<SourceSentenceItem>[],
  mySentences: MySentence[] = [],
): Map<string, LinkedSentence[]> {
  const map = new Map<string, LinkedSentence[]>();
  const push = (termId: string, s: LinkedSentence) => {
    const list = map.get(termId);
    if (list) list.push(s);
    else map.set(termId, [s]);
  };
  for (const s of manual) {
    for (const t of grammarTermsOf(s)) {
      push(t.id, {
        id: s.id,
        text: s.text,
        translation: s.translation ?? null,
      });
    }
  }
  for (const s of aiLessonSentences) {
    for (const t of s.grammarTerms ?? []) {
      push(t.id, {
        id: s.id,
        text: s.jp,
        translation: s.en,
        aiLessonTitle: s.aiLessonTitle,
      });
    }
  }
  for (const s of mySentences) {
    for (const t of groupTermsByCategory(s.terms ?? []).grammar) {
      push(t.id, {
        id: s.id,
        text: s.correction?.trim() ? s.correction : s.text,
        translation: s.translation ?? null,
        mine: true,
      });
    }
  }
  return map;
}

/**
 * Map each grammar-tag id → the learner's own sentences that used that grammar **incorrectly** (from
 * `incorrectGrammarTerms`). Renders the "Used incorrectly here" section on a grammar note, separate
 * from "Sentences using this grammar". Shows the sentence as the learner wrote it (the misuse).
 */
export function misusedSentencesByGrammarTagId(
  mySentences: MySentence[],
): Map<string, LinkedSentence[]> {
  const map = new Map<string, LinkedSentence[]>();
  for (const s of mySentences) {
    for (const t of s.incorrectGrammarTerms ?? []) {
      const entry: LinkedSentence = {
        id: s.id,
        text: s.text,
        translation: s.translation ?? null,
        mine: true,
      };
      const list = map.get(t.id);
      if (list) list.push(entry);
      else map.set(t.id, [entry]);
    }
  }
  return map;
}
