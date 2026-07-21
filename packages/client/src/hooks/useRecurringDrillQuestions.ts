import { useMemo } from "react";

import { useDrillSessions } from "@/hooks/useDrillSessions";
import { recurringQuestions } from "@/lib/drill-recurring";

/**
 * Recent recurring-mistake data keyed by normalized question, derived from all drill sessions. Shared
 * by the mistake card (which looks up its own question for a warning badge) and the stats callout
 * (which lists the flagged ones). Reads the already-cached `useDrillSessions` query, so mounting it in
 * several places costs one fetch.
 */
export function useRecurringDrillQuestions() {
  const sessions = useDrillSessions();
  const data = sessions.data;
  return useMemo(
    () => recurringQuestions(data ?? [], new Date()),
    [data],
  );
}
