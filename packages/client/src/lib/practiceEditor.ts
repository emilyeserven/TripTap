import type {
  CreatePracticeSentenceInput,
  PracticeComprehension,
  PracticeGrammar,
  PracticeSentence,
  PracticeTargetKind,
  PracticeWord,
  SentenceTermRef,
} from "@sentence-bank/types";

/** Placeholder register option; maps to a null register on save. */
export const NONE = "—";

/** Politeness/register options; `NONE` maps to a null register. */
export const REGISTERS = [
  NONE,
  "casual (タメ口)",
  "polite (です・ます)",
  "humble (謙譲)",
  "honorific (尊敬)",
  "written / formal",
  "slang",
] as const;

/** Target kinds, paired with their display labels. */
export const TARGET_KINDS: { value: PracticeTargetKind;
  label: string; }[] = [
  {
    value: "word",
    label: "word",
  },
  {
    value: "grammar",
    label: "grammar point",
  },
  {
    value: "idiom",
    label: "idiom / set phrase",
  },
  {
    value: "collocation",
    label: "collocation",
  },
  {
    value: "reading",
    label: "reading / kanji",
  },
];

/** Comprehension buckets (Tofugu's curation gate), with their guidance. */
export const COMPREHENSION_OPTIONS: { value: PracticeComprehension;
  label: string;
  hint: string; }[] = [
  {
    value: "ready",
    label: "Ready to card",
    hint: "I get 80%+",
  },
  {
    value: "studying",
    label: "Study the parts",
    hint: "under 80%",
  },
  {
    value: "skip",
    label: "Skip for now",
    hint: "under 50%",
  },
];

export const emptyWord = (): PracticeWord => ({
  w: "",
  r: "",
  m: "",
});

export const emptyGrammar = (): PracticeGrammar => ({
  p: "",
  n: "",
});

/** The editable draft: the practice sentence's own fields (vocab + output live in child components). */
export interface PracticeDraft {
  text: string;
  language: string;
  reading: string;
  translation: string;
  target: string;
  targetKind: PracticeTargetKind;
  comprehension: PracticeComprehension | null;
  guess: string;
  literal: string;
  register: string;
  nuance: string;
  page: string;
  words: PracticeWord[];
  grammar: PracticeGrammar[];
  terms: SentenceTermRef[];
  sourceId: string | null;
  needsCorrection: boolean;
}

/** Setter for one draft field; children call this instead of owning state. */
export type SetPracticeDraft = <K extends keyof PracticeDraft>(key: K, value: PracticeDraft[K]) => void;

export function toDraft(ps: PracticeSentence): PracticeDraft {
  return {
    text: ps.text,
    language: ps.language,
    reading: ps.reading ?? "",
    translation: ps.translation ?? "",
    target: ps.target ?? "",
    targetKind: ps.targetKind ?? "word",
    comprehension: ps.comprehension,
    guess: ps.guess ?? "",
    literal: ps.literal ?? "",
    register: ps.register ?? NONE,
    nuance: ps.nuance ?? "",
    page: ps.page ?? "",
    words: ps.words?.length ? ps.words : [emptyWord()],
    grammar: ps.grammar?.length ? ps.grammar : [emptyGrammar()],
    terms: ps.terms ?? [],
    sourceId: ps.sourceId,
    needsCorrection: ps.needsCorrection,
  };
}

/** Build the API input from the draft, dropping empty rows. */
export function toInput(draft: PracticeDraft): CreatePracticeSentenceInput {
  const cleanWords = draft.words.filter(w => w.w.trim() || w.r.trim() || w.m.trim());
  const cleanGrammar = draft.grammar.filter(g => g.p.trim() || g.n.trim());
  return {
    text: draft.text,
    language: draft.language,
    reading: draft.reading || null,
    translation: draft.translation || null,
    target: draft.target || null,
    targetKind: draft.target ? draft.targetKind : null,
    comprehension: draft.comprehension,
    guess: draft.guess || null,
    literal: draft.literal || null,
    register: draft.register === NONE ? null : draft.register,
    nuance: draft.nuance || null,
    words: cleanWords.length > 0 ? cleanWords : null,
    grammar: cleanGrammar.length > 0 ? cleanGrammar : null,
    terms: draft.terms.length > 0 ? draft.terms : null,
    sourceId: draft.sourceId,
    page: draft.page || null,
    needsCorrection: draft.needsCorrection,
  };
}

/** Speak Japanese slowly, for shadowing / pitch-accent practice. Best-effort. */
export function speakSlow(text: string) {
  try {
    if (globalThis.speechSynthesis && text) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.55;
      globalThis.speechSynthesis.cancel();
      globalThis.speechSynthesis.speak(u);
    }
  }
  catch {
    // ignore — TTS is best-effort
  }
}
