import type { ReadingLevel } from "@/stores/uiStore";

import { createContext, useContext } from "react";

/** The active reading level (N4 "easy" vs native "full") for dual-level content. Provided by AiLessonTemplate. */
export const ReadingLevelContext = createContext<ReadingLevel>("full");

export function useReadingLevel(): ReadingLevel {
  return useContext(ReadingLevelContext);
}
