import { create } from "zustand";

interface UiState {
  /** Whether translations are revealed on the sentence cards (turn off to self-test). */
  showTranslations: boolean;
  toggleShowTranslations: () => void;
  /** Whether furigana readings are shown across lesson content (app-wide). */
  furigana: boolean;
  toggleFurigana: () => void;
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
}));
