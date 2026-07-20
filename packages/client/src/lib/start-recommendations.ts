import type {
  AnswerSheet,
  BookmarkResource,
  BookmarkSectionMatch,
  GrammarNote,
  LearnerProfile,
  LearningArea,
  LearningAreaTagMap,
  QuestionSheet,
  WritingPrompt,
  XpSummary,
} from "@sentence-bank/types";

import { LEARNING_AREAS } from "@sentence-bank/types";

import { dueDateMet } from "@/lib/answer-sheets";
import { isDueSoon } from "@/lib/due-date";

/** How far ahead (in days) a due question sheet counts as a "do this first" suggestion. */
export const DUE_SOON_DAYS = 7;
/** Cap on due-sheet suggestions so one busy week doesn't crowd out the lowest-area pick. */
const DUE_LIMIT = 2;

/**
 * One ranked Start Something suggestion. `to`/`params`/`search` describe the router link; the Start
 * page renders them with a `Link`.
 */
export interface StartSuggestion {
  id: string;
  kind: "due-sheet" | "area" | "starred-grammar" | "goal";
  /** The learning area this suggestion practices; null when it spans several. */
  area: LearningArea | null;
  title: string;
  /** Supporting line ("Because Speaking is your lowest area", the section to do, …); null if none. */
  description: string | null;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

/** Everything the ranker reads. All optional except the XP summary — absent data just narrows picks. */
export interface StartRecommendationInput {
  summary: XpSummary;
  profile?: LearnerProfile;
  questionSheets?: QuestionSheet[];
  answerSheets?: AnswerSheet[];
  grammarNotes?: GrammarNote[];
  writingPrompts?: WritingPrompt[];
  areaTags?: LearningAreaTagMap;
  /** Bookmark sections tagged with the lowest area's mapped tag (the "quick and contained" pool). */
  lowestAreaSections?: BookmarkSectionMatch[];
  /** Whole resources tagged with the lowest area's mapped tag (fallback when no sections match). */
  lowestAreaResources?: BookmarkResource[];
  now: Date;
}

/** The area with the least all-time XP (ties break in `LEARNING_AREAS` order). */
export function lowestXpArea(summary: XpSummary): LearningArea {
  const byArea = new Map(summary.areas.map(a => [a.area, a.xp]));
  let lowest: LearningArea = LEARNING_AREAS[0];
  for (const area of LEARNING_AREAS) {
    if ((byArea.get(area) ?? 0) < (byArea.get(lowest) ?? 0)) lowest = area;
  }
  return lowest;
}

/** The goals that explicitly target `area`, used to explain why a pick matters. */
function goalsForArea(profile: LearnerProfile | undefined, area: LearningArea) {
  return (profile?.goals ?? []).filter(goal => goal.learningAreas.includes(area));
}

/** Link search params prefilling a new-session form with a section's owning bookmark. */
function bookmarkSearch(match: BookmarkSectionMatch): Record<string, string> {
  return {
    bookmarkId: match.bookmarkId,
    bookmarkTitle: match.bookmarkTitle,
    ...(match.bookmarkUrl
      ? {
        bookmarkUrl: match.bookmarkUrl,
      }
      : {}),
  };
}

/** Overdue/soon-due question sheets not yet satisfied by a completed answer sheet. */
function dueSheetSuggestions(input: StartRecommendationInput): StartSuggestion[] {
  const answers = input.answerSheets ?? [];
  return (input.questionSheets ?? [])
    .filter((sheet): sheet is QuestionSheet & { dueDate: string } => sheet.dueDate !== null)
    .filter(sheet => isDueSoon(sheet.dueDate, input.now, DUE_SOON_DAYS))
    .filter(sheet => !dueDateMet(sheet, answers.filter(a => a.questionSheetId === sheet.id)))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, DUE_LIMIT)
    .map(sheet => ({
      id: `due-${sheet.id}`,
      kind: "due-sheet" as const,
      area: sheet.learningAreas?.[0] ?? null,
      title: `Answer "${sheet.title}"`,
      description: "It has a due date coming up.",
      to: "/question-sheets/$id",
      params: {
        id: sheet.id,
      },
    }));
}

/**
 * The concrete pick for the lowest-XP area. Prefers a tagged bookmark *section* (quick and contained),
 * then a whole tagged resource, then the bare session entry point for the area.
 */
function areaSuggestion(input: StartRecommendationInput, area: LearningArea): StartSuggestion {
  const goals = goalsForArea(input.profile, area);
  const why = goals.length > 0
    ? `${area} is your lowest area and part of "${goals[0].title}".`
    : `${area} is your lowest area.`;
  const section = input.lowestAreaSections?.[0];
  const resource = input.lowestAreaResources?.[0];
  const base = {
    id: `area-${area}`,
    kind: "area" as const,
    area,
  };

  switch (area) {
    case "Speaking":
      if (section) {
        return {
          ...base,
          title: `Shadow "${section.section.label}" of ${section.bookmarkTitle}`,
          description: why,
          to: "/shadowing/new",
          search: bookmarkSearch(section),
        };
      }
      return {
        ...base,
        title: resource ? `Shadow a bit of ${resource.title}` : "Start a short shadowing session",
        description: why,
        to: "/shadowing/new",
        ...(resource
          ? {
            search: {
              bookmarkId: resource.id,
              bookmarkTitle: resource.title,
              ...(resource.url
                ? {
                  bookmarkUrl: resource.url,
                }
                : {}),
            },
          }
          : {}),
      };
    case "Listening":
      if (section) {
        return {
          ...base,
          title: `Listen to "${section.section.label}" of ${section.bookmarkTitle}`,
          description: why,
          to: "/listening-sessions/new",
          search: bookmarkSearch(section),
        };
      }
      return {
        ...base,
        title: resource
          ? `Listen to a bit of ${resource.title}`
          : "Start a short listening session",
        description: why,
        to: "/listening-sessions/new",
        ...(resource
          ? {
            search: {
              bookmarkId: resource.id,
              bookmarkTitle: resource.title,
              ...(resource.url
                ? {
                  bookmarkUrl: resource.url,
                }
                : {}),
            },
          }
          : {}),
      };
    case "Reading": {
      const title = section
        ? `Read "${section.section.label}" of ${section.bookmarkTitle}`
        : resource
          ? `Read a bit of ${resource.title}`
          : "Start a short reading session";
      const readingTitle = section?.bookmarkTitle ?? resource?.title;
      return {
        ...base,
        title,
        description: why,
        to: "/reading-sessions/new",
        ...(readingTitle
          ? {
            search: {
              title: readingTitle,
            },
          }
          : {}),
      };
    }
    case "Writing": {
      const prompt = input.writingPrompts?.[0];
      if (prompt) {
        return {
          ...base,
          title: `Write from the prompt "${prompt.title ?? prompt.text}"`,
          description: why,
          to: "/writing-prompts/$id",
          params: {
            id: prompt.id,
          },
        };
      }
      return {
        ...base,
        title: "Write a few sentences in My Writing",
        description: why,
        to: "/my-writing",
      };
    }
    case "Grammar": {
      // Starred grammar points get first claim on the Grammar slot.
      const starred = (input.grammarNotes ?? []).find(note => note.starred);
      const goalTerm = (input.profile?.goals ?? []).flatMap(goal => goal.grammarTerms)[0];
      const goalNote = goalTerm
        ? (input.grammarNotes ?? []).find(note => note.tagId === goalTerm.id)
        : undefined;
      const note = starred ?? goalNote;
      if (note) {
        return {
          ...base,
          title: `Review the grammar point "${note.title}"`,
          description: starred ? `${why} You starred this one.` : why,
          to: "/grammar-notes/$id",
          params: {
            id: note.id,
          },
        };
      }
      return {
        ...base,
        title: "Review a grammar note",
        description: why,
        to: "/grammar-notes",
      };
    }
    case "Vocabulary":
      return {
        ...base,
        title: "Do a quick practice pass",
        description: why,
        to: "/practice",
      };
  }
}

/** A starred grammar point always surfaces (even when Grammar isn't the lowest area). */
function starredGrammarSuggestion(
  input: StartRecommendationInput,
  alreadySuggested: Set<string>,
): StartSuggestion | null {
  const starred = (input.grammarNotes ?? []).filter(note => note.starred);
  const note = starred.find(n => !alreadySuggested.has(n.id));
  if (!note) return null;
  return {
    id: `starred-${note.id}`,
    kind: "starred-grammar",
    area: "Grammar",
    title: `Revisit "${note.title}"`,
    description: "You starred this grammar point.",
    to: "/grammar-notes/$id",
    params: {
      id: note.id,
    },
  };
}

/** One suggestion per goal, from its grammar terms (a matching note) — light-touch goal nudges. */
function goalSuggestions(
  input: StartRecommendationInput,
  alreadySuggested: Set<string>,
): StartSuggestion[] {
  const notes = input.grammarNotes ?? [];
  return (input.profile?.goals ?? []).flatMap((goal) => {
    const note = goal.grammarTerms
      .map(term => notes.find(n => n.tagId === term.id))
      .find(n => n && !alreadySuggested.has(n.id));
    if (!note) return [];
    alreadySuggested.add(note.id);
    return [{
      id: `goal-${goal.id}`,
      kind: "goal" as const,
      area: "Grammar" as const,
      title: `Work on "${note.title}"`,
      description: `Part of your goal "${goal.title}".`,
      to: "/grammar-notes/$id",
      params: {
        id: note.id,
      },
    }];
  });
}

/**
 * The ranked Start Something list: due sheets first, then the lowest-XP area's concrete pick, then a
 * starred grammar point, then goal nudges. The first entry is the hero suggestion.
 */
export function buildStartSuggestions(input: StartRecommendationInput): StartSuggestion[] {
  const suggestions: StartSuggestion[] = [...dueSheetSuggestions(input)];
  const lowest = lowestXpArea(input.summary);
  const areaPick = areaSuggestion(input, lowest);
  suggestions.push(areaPick);

  // Track grammar-note ids already used so the starred/goal slots don't repeat the area pick.
  const usedNoteIds = new Set<string>(
    areaPick.to === "/grammar-notes/$id" && areaPick.params ? [areaPick.params.id] : [],
  );
  const starred = starredGrammarSuggestion(input, usedNoteIds);
  if (starred) {
    if (starred.params) usedNoteIds.add(starred.params.id);
    suggestions.push(starred);
  }
  suggestions.push(...goalSuggestions(input, usedNoteIds));
  return suggestions;
}
