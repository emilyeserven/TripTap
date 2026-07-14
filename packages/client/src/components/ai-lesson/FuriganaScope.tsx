import type { ReactNode } from "react";

import { FuriganaContext } from "./furigana-context";

import { useUiStore } from "@/stores/uiStore";

/** Provides the app-wide furigana setting to AI Lesson content rendered inside it. */
export function FuriganaScope({
  children,
}: { children: ReactNode }) {
  const furigana = useUiStore(s => s.furigana);
  return <FuriganaContext.Provider value={furigana}>{children}</FuriganaContext.Provider>;
}
