import { create } from "zustand";

interface UiState {
  /** Whether translations are revealed on the sentence cards (turn off to self-test). */
  showTranslations: boolean;
  toggleShowTranslations: () => void;
}

export const useUiStore = create<UiState>(set => ({
  showTranslations: true,
  toggleShowTranslations: () => set(state => ({
    showTranslations: !state.showTranslations,
  })),
}));
