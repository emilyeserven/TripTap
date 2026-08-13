import type { AttentionGroup, AttentionItem } from "@/lib/attention";
import type { AttentionKind, AttentionSettings, HiddenAttentionItem } from "@sentence-bank/types";

import { useCallback, useMemo } from "react";

import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useCorrectionLog } from "@/hooks/useCorrections";
import { useDrillSessions } from "@/hooks/useDrillSessions";
import { useLessons } from "@/hooks/useLessons";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { useReadingSessions } from "@/hooks/useReadingSessions";
import { useRuleGroups } from "@/hooks/useRuleGroups";
import { useSentences } from "@/hooks/useSentences";
import { useAttentionSettings, useUpdateAttentionSettings } from "@/hooks/useSettings";
import { useWritings } from "@/hooks/useWritings";
import { buildAttention, hiddenItemKey, toHiddenItem } from "@/lib/attention";

const NO_HIDDEN: AttentionSettings = {
  hiddenKinds: [],
  hiddenItems: [],
};

export interface UseAttentionResult {
  /** The visible inbox: hidden rows and hidden kinds already filtered out. */
  groups: AttentionGroup[];
  isLoading: boolean;
  /** What the learner has hidden, for the inbox page's "Hidden" section. */
  hidden: AttentionSettings;
  /** Hide one row (a title snapshot is stored so the hidden list can still name it). */
  hideItem: (item: AttentionItem) => void;
  unhideItem: (entry: Pick<HiddenAttentionItem, "kind" | "id">) => void;
  /** Hide a whole kind — the group stops appearing however many items it has. */
  hideKind: (kind: AttentionKind) => void;
  unhideKind: (kind: AttentionKind) => void;
  /** Clear the whole hide list. */
  unhideAll: () => void;
  /** True while a hide/unhide is in flight. */
  isUpdatingHidden: boolean;
}

/**
 * The "needs your attention" inbox, composed from the app's already-cached list queries (the same
 * pattern as the Start page's suggestions). Acting on an item mutates the row a filter reads, so the
 * existing mutation invalidations clear inbox entries with no extra wiring.
 *
 * Rows that will never be acted on can instead be hidden: the hide list is server-stored settings
 * (so it follows the learner across devices) and is applied inside {@link buildAttention}, which is
 * why the homepage card's counts match the page without knowing hiding exists.
 */
export function useAttention(): UseAttentionResult {
  const mySentences = useSentences({
    kind: "mine",
  });
  const questionSheets = useQuestionSheets();
  const answerSheets = useAnswerSheets();
  const readingSessions = useReadingSessions();
  const lessons = useLessons();
  const drillSessions = useDrillSessions();
  const correctionLog = useCorrectionLog();
  const ruleGroups = useRuleGroups();
  const writings = useWritings();
  const attentionSettings = useAttentionSettings();
  const updateAttentionSettings = useUpdateAttentionSettings();

  const hidden = attentionSettings.data ?? NO_HIDDEN;

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
      hidden,
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
      hidden,
    ],
  );

  const {
    mutate: saveHidden,
  } = updateAttentionSettings;

  const hideItem = useCallback((item: AttentionItem) => {
    const key = hiddenItemKey(item);
    saveHidden({
      hiddenItems: [
        ...hidden.hiddenItems.filter(h => hiddenItemKey(h) !== key),
        toHiddenItem(item, new Date()),
      ],
    });
  }, [hidden.hiddenItems, saveHidden]);

  const unhideItem = useCallback((entry: Pick<HiddenAttentionItem, "kind" | "id">) => {
    const key = hiddenItemKey(entry);
    saveHidden({
      hiddenItems: hidden.hiddenItems.filter(h => hiddenItemKey(h) !== key),
    });
  }, [hidden.hiddenItems, saveHidden]);

  const hideKind = useCallback((kind: AttentionKind) => {
    if (hidden.hiddenKinds.includes(kind)) return;
    saveHidden({
      hiddenKinds: [...hidden.hiddenKinds, kind],
    });
  }, [hidden.hiddenKinds, saveHidden]);

  const unhideKind = useCallback((kind: AttentionKind) => {
    saveHidden({
      hiddenKinds: hidden.hiddenKinds.filter(k => k !== kind),
    });
  }, [hidden.hiddenKinds, saveHidden]);

  const unhideAll = useCallback(() => {
    saveHidden({
      hiddenKinds: [],
      hiddenItems: [],
    });
  }, [saveHidden]);

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
    attentionSettings,
  ].some(q => q.isLoading);

  return {
    groups,
    isLoading,
    hidden,
    hideItem,
    unhideItem,
    hideKind,
    unhideKind,
    unhideAll,
    isUpdatingHidden: updateAttentionSettings.isPending,
  };
}
