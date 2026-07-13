import type {
  Sentence,
  SentenceTermRef,
  SourceSentenceItem,
  WithLesson,
} from "@sentence-bank/types";

import { groupTermsByCategory } from "./terms";

/** A sentence linked to a grammar item because they share a Grammar source tag. */
export interface LinkedSentence {
  id: string;
  text: string;
  translation: string | null;
  /** The lesson the sentence was mined from, when it is a lesson source sentence. */
  lessonTitle?: string;
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
 * Map each grammar-tag id → the sentences (manual + lesson-mined) carrying that tag. Used to render
 * "Sentences using this grammar" under a grammar item that shares the tag.
 */
export function sentencesByGrammarTagId(
  manual: Sentence[],
  lessonSentences: WithLesson<SourceSentenceItem>[],
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
  for (const s of lessonSentences) {
    for (const t of s.grammarTerms ?? []) {
      push(t.id, {
        id: s.id,
        text: s.jp,
        translation: s.en,
        lessonTitle: s.lessonTitle,
      });
    }
  }
  return map;
}
