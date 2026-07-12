import { create } from "zustand";

/** Study level, used to suggest a daily sentence add-rate (Tofugu: 1 / 3 / 5 per day). */
export type StudyLevel = "beginner" | "intermediate" | "advanced";

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
}));
