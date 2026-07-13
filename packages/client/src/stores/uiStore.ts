import { create } from "zustand";

/** Study level, used to suggest a daily sentence add-rate (Tofugu: 1 / 3 / 5 per day). */
export type StudyLevel = "beginner" | "intermediate" | "advanced";

/**
 * When a Listen-and-Shadow / Shadowing note gets stamped: at the moment the learner starts typing, or
 * at submit. Global UI pref (mirrors the reference note-taker app's single setting).
 */
export type TimestampMode = "typing-start" | "submit";

/**
 * The kana script produced by kana-only note entry: romaji is converted to hiragana or katakana as the
 * learner types (never kanji). Global UI pref, mirroring {@link TimestampMode}.
 */
export type KanaScript = "hiragana" | "katakana";

interface UiState {
  /** Whether translations are revealed on the sentence cards (turn off to self-test). */
  showTranslations: boolean;
  toggleShowTranslations: () => void;
  /** Whether furigana readings are shown across lesson content (app-wide). */
  furigana: boolean;
  toggleFurigana: () => void;
  /** The learner's self-assessed level, driving the practice add-rate guidance. */
  studyLevel: StudyLevel;
  setStudyLevel: (level: StudyLevel) => void;
  /** When note timestamps are captured while shadowing (typing-start vs submit). */
  timestampMode: TimestampMode;
  setTimestampMode: (mode: TimestampMode) => void;
  /** Whether session notes are typed in kana-only mode (romaji auto-converted, plus a context field). */
  kanaEntry: boolean;
  setKanaEntry: (on: boolean) => void;
  /** Which kana script the kana-only entry produces (hiragana vs katakana). */
  kanaScript: KanaScript;
  setKanaScript: (script: KanaScript) => void;
}

export const useUiStore = create<UiState>(set => ({
  showTranslations: true,
  toggleShowTranslations: () => set(state => ({
    showTranslations: !state.showTranslations,
  })),
  furigana: true,
  toggleFurigana: () => set(state => ({
    furigana: !state.furigana,
  })),
  studyLevel: "intermediate",
  setStudyLevel: level => set({
    studyLevel: level,
  }),
  timestampMode: "submit",
  setTimestampMode: mode => set({
    timestampMode: mode,
  }),
  kanaEntry: false,
  setKanaEntry: on => set({
    kanaEntry: on,
  }),
  kanaScript: "hiragana",
  setKanaScript: script => set({
    kanaScript: script,
  }),
}));
