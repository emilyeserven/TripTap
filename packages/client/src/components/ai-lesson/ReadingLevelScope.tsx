import type { ReactNode } from "react";

import { ReadingLevelContext } from "./reading-level-context";

import { useUiStore } from "@/stores/uiStore";

/** Provides the app-wide reading-level setting to dual-level AI Lesson content rendered inside it. */
export function ReadingLevelScope({
  children,
}: { children: ReactNode }) {
  const readingLevel = useUiStore(s => s.readingLevel);
  return <ReadingLevelContext.Provider value={readingLevel}>{children}</ReadingLevelContext.Provider>;
}
