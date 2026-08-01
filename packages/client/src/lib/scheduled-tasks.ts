import type { ScheduledTask, ScheduledTaskTarget } from "@sentence-bank/types";

import { bookmarkAppUrl } from "./bookmarks";
import { sessionSearch } from "./start-recommendations";

/** How a scheduled task opens: an internal router link, or an external URL (the bookmarks app). */
export interface ScheduledTaskOpen {
  internal?: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  };
  external?: string;
}

/**
 * Resolve where a scheduled task opens:
 * - question sheet → the question sheet view (its parts + links to answer it);
 * - answer sheet (legacy) → the answer sheet, focused on its part (`?part=`) when one is set;
 * - resource + section → a new Reading session prefilled with the section (mirrors the daily-task /
 *   lineup "do this section" behavior);
 * - whole resource → the external bookmarks app.
 */
export function scheduledTaskOpen(
  target: ScheduledTaskTarget,
  endpointUrl: string | null | undefined,
): ScheduledTaskOpen {
  if (target.kind === "question-sheet") {
    return {
      internal: {
        to: "/question-sheets/$id",
        params: {
          id: target.questionSheetId,
        },
      },
    };
  }
  if (target.kind === "answer-sheet") {
    // Open the edit form (where you answer), scrolled to the part when one is set.
    return {
      internal: {
        to: "/answer-sheets/$id/edit",
        params: {
          id: target.answerSheetId,
        },
        search: target.partId
          ? {
            part: target.partId,
          }
          : {},
      },
    };
  }
  if (target.section) {
    return {
      internal: {
        to: "/reading-sessions/new",
        search: sessionSearch(
          "/reading-sessions/new",
          target.resourceId,
          target.resourceTitle,
          null,
          target.section,
        ),
      },
    };
  }
  return {
    external: bookmarkAppUrl(endpointUrl, target.resourceId),
  };
}

/** The row's primary label — the override, else the target's snapshot title. */
export function scheduledTaskTitle(task: ScheduledTask): string {
  if (task.label?.trim()) return task.label;
  const t = task.target;
  if (t.kind === "question-sheet") return t.title?.trim() || "Question sheet";
  if (t.kind === "answer-sheet") return t.title?.trim() || "Answer sheet";
  return t.resourceTitle.trim() || "Resource";
}
