import type { StartSuggestion } from "@/lib/start-recommendations";
import type { DailyLineup, LineupItem, LineupSessionType } from "@sentence-bank/types";

/**
 * Pure helpers for the day's lineup — the ordered, locked-in practice sequence built on the Start
 * Something page. The stored blob is today-only: a `date` mismatch means a fresh day, so the caller
 * gets an empty lineup and the stale blob is simply overwritten on the next save.
 */

/** Today's date (YYYY-MM-DD) in the client's local calendar — NOT toISOString, which is UTC. */
export function todayDateString(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A fresh lineup for `date` with nothing locked in and nothing excluded. */
export function emptyLineup(date: string): DailyLineup {
  return {
    date,
    items: [],
    exclusions: {
      mediaTypes: [],
      sessionTypes: [],
      learningAreas: [],
      complexityMin: null,
      complexityMax: null,
    },
  };
}

/** The lineup to show for `today`: the stored one when current, otherwise a fresh empty day. */
export function effectiveLineup(stored: DailyLineup | null, today: string): DailyLineup {
  return stored && stored.date === today ? stored : emptyLineup(today);
}

/** Snapshot a suggestion into a lineup entry (not yet done). */
export function suggestionToLineupItem(suggestion: StartSuggestion): LineupItem {
  return {
    id: suggestion.id,
    kind: suggestion.kind,
    area: suggestion.area,
    title: suggestion.title,
    description: suggestion.description,
    to: suggestion.to,
    params: suggestion.params,
    search: suggestion.search,
    resourceId: suggestion.resourceId,
    sectionId: suggestion.sectionId,
    done: false,
  };
}

/** Flip one item's done state. */
export function toggleItemDone(items: LineupItem[], id: string): LineupItem[] {
  return items.map(item => (item.id === id
    ? {
      ...item,
      done: !item.done,
    }
    : item));
}

/** Set one item's title (the lineup editor's rename control); empty/blank titles are ignored. */
export function renameItem(items: LineupItem[], id: string, title: string): LineupItem[] {
  const trimmed = title.trim();
  if (!trimmed) return items;
  return items.map(item => (item.id === id
    ? {
      ...item,
      title: trimmed,
    }
    : item));
}

/** Move the item at `index` one step up (-1) or down (+1), clamped to the list. */
export function moveItem(items: LineupItem[], index: number, direction: -1 | 1): LineupItem[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Drop one item. */
export function removeItem(items: LineupItem[], id: string): LineupItem[] {
  return items.filter(item => item.id !== id);
}

/**
 * The route targets each excludable session type produces, used to drop suggestions for excluded
 * activities. Due question sheets deliberately map to no session type — deadlines always surface.
 */
export const SESSION_TYPE_ROUTES: Record<LineupSessionType, string[]> = {
  reading: ["/reading-sessions/new"],
  listening: ["/listening-sessions/new"],
  shadowing: ["/shadowing/new"],
  writing: ["/my-writing", "/writing-prompts/$id"],
  drills: ["/drill-sessions/new"],
  practice: ["/practice"],
};
