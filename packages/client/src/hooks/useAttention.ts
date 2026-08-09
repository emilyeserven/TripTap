import type { AttentionGroup } from "@/lib/attention";

import { useMemo } from "react";

import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useCorrectionLog } from "@/hooks/useCorrections";
import { useDrillSessions } from "@/hooks/useDrillSessions";
import { useLessons } from "@/hooks/useLessons";
import { useMySentences } from "@/hooks/useMySentences";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { useReadingSessions } from "@/hooks/useReadingSessions";
import { useRuleGroups } from "@/hooks/useRuleGroups";
import { useWritings } from "@/hooks/useWritings";
import { buildAttention } from "@/lib/attention";

/**
 * The "needs your attention" inbox, composed from the app's already-cached list queries (the same
 * pattern as the Start page's suggestions). Acting on an item mutates the row a filter reads, so the
 * existing mutation invalidations clear inbox entries with no extra wiring.
 */
export function useAttention(): { groups: AttentionGroup[];
  isLoading: boolean; } {
  const mySentences = useMySentences();
  const questionSheets = useQuestionSheets();
  const answerSheets = useAnswerSheets();
  const readingSessions = useReadingSessions();
  const lessons = useLessons();
  const drillSessions = useDrillSessions();
  const correctionLog = useCorrectionLog();
  const ruleGroups = useRuleGroups();
  const writings = useWritings();

  const groups = useMemo(
    () => buildAttention({
      mySentences: mySentences.data ?? [],
      questionSheets: questionSheets.data ?? [],
      answerSheets: answerSheets.data ?? [],
      readingSessions: readingSessions.data ?? [],
      lessons: lessons.data ?? [],
      drillSessions: drillSessions.data ?? [],
      correctionLog: correctionLog.data ?? null,
      ruleGroups: ruleGroups.data ?? [],
      writings: writings.data ?? [],
      now: new Date(),
    }),
    [
      mySentences.data,
      questionSheets.data,
      answerSheets.data,
      readingSessions.data,
      lessons.data,
      drillSessions.data,
      correctionLog.data,
      ruleGroups.data,
      writings.data,
    ],
  );

  const isLoading = [
    mySentences,
    questionSheets,
    answerSheets,
    readingSessions,
    lessons,
    drillSessions,
    correctionLog,
    ruleGroups,
    writings,
  ].some(q => q.isLoading);

  return {
    groups,
    isLoading,
  };
}
