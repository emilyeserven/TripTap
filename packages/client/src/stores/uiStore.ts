import { create } from "zustand";

interface UiState {
  /** Whether trips that have already ended are shown in the list. */
  showPastTrips: boolean;
  toggleShowPastTrips: () => void;
}

export const useUiStore = create<UiState>(set => ({
  showPastTrips: true,
  toggleShowPastTrips: () => set(state => ({
    showPastTrips: !state.showPastTrips,
  })),
}));
