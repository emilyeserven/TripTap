import { createContext, useContext } from "react";

/** Whether furigana (readings) are shown. Provided by LessonTemplate. */
export const FuriganaContext = createContext(true);

export function useFurigana(): boolean {
  return useContext(FuriganaContext);
}
