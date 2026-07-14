import type { VocabItem } from "@sentence-bank/types";

import { createContext, useContext } from "react";

/** Maps a vocab term (its `jp`) to its entry, so VocabPill can resolve hover details. */
export const VocabMapContext = createContext<Record<string, VocabItem>>({});

export function useVocabMap(): Record<string, VocabItem> {
  return useContext(VocabMapContext);
}
