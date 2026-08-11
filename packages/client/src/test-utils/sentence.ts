import type { Sentence } from "@sentence-bank/types";

/**
 * A fully-populated unified `Sentence` for tests. The merged wire type carries every facet
 * (bank provenance, correction workflow, practice worksheet), so hand-written literals went from
 * 20 fields to 40 — spread overrides onto this instead.
 */
export function makeSentence(overrides: Partial<Sentence> = {}): Sentence {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    kind: "bank",
    text: "毎朝コーヒーを飲みます。",
    translation: "I drink coffee every morning.",
    reading: null,
    readingError: null,
    language: "Japanese",
    source: null,
    sourceId: null,
    page: null,
    captureId: null,
    derivedFromId: null,
    notes: null,
    tags: null,
    terms: null,
    shadowingCandidate: false,
    needsCorrection: false,
    correction: null,
    writingId: null,
    lessonId: null,
    actualMeaning: null,
    explanation: null,
    incorrectGrammarTerms: null,
    reasons: null,
    marks: null,
    readingNote: null,
    target: null,
    targetKind: null,
    comprehension: null,
    guess: null,
    literal: null,
    register: null,
    nuance: null,
    words: null,
    grammar: null,
    passes: null,
    hasAudio: false,
    hasImage: false,
    vocabCount: 0,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}
