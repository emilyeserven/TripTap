import type {
  AnswerSheet,
  BookmarkResource,
  BookmarkSectionMatch,
  ComplexityScale,
  GrammarNote,
  LearnerProfile,
  LearningArea,
  LearningAreaTagMap,
  LineupExclusions,
  MaterialTypeTagMap,
  QuestionSheet,
  StartSuggestionKind,
  WritingPrompt,
  XpSummary,
} from "@sentence-bank/types";

import { LEARNING_AREAS } from "@sentence-bank/types";

import { dueDateMet } from "@/lib/answer-sheets";
import { matchesComplexity, resourceMaterialTypes } from "@/lib/collections";
import { SESSION_TYPE_ROUTES } from "@/lib/daily-lineup";
import { isDueSoon } from "@/lib/due-date";

/**
 * Content-status preference for suggestions (lower = preferred): actively-consumed and queued material
 * first, done/abandoned last. Unknown/unset statuses sit in the neutral middle. Read from the bookmark
 * app's "Content Status" choices property.
 */
const CONTENT_STATUS_RANK: Record<string, number> = {
  "reading": 0,
  "shortlist": 1,
  "paused": 2,
  "not-started": 3,
  "ai-summary-queue": 4,
  "summarized-by-ai": 4,
  "finished": 5,
  "dropped": 6,
};

function contentStatusRank(status: string | null): number {
  return status && status in CONTENT_STATUS_RANK ? CONTENT_STATUS_RANK[status] : 3;
}

/**
 * Parse a section's raw `startValue` into a sortable number: a `HH:MM:SS(.mmm)` / `M:SS` timestamp to
 * seconds, a plain page number to itself. Null when it can't be read (caller keeps upstream order).
 */
export function parseStartValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^(\d+:)?\d{1,2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return trimmed.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
  }
  return null;
}

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
  kind: StartSuggestionKind;
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
  /** All resources by bookmark id, so a section can read its owning bookmark's complexity/status/type. */
  resourcesById?: Record<string, BookmarkResource>;
  /** The material-type → tag map, for detecting Sequential vs Out-of-Order resources. */
  materialTypeTags?: MaterialTypeTagMap;
  /** The complexity scale, for the complexity-band filter. */
  complexityScale?: ComplexityScale | null;
  /** Today's lineup exclusions — excluded properties never produce suggestions. */
  exclusions?: LineupExclusions;
  /** Bookmark ids the learner starred locally; boosted to the front of the pick pools. */
  favoriteResourceIds?: string[];
  now: Date;
}

/**
 * The non-excluded area with the least all-time XP (ties break in `LEARNING_AREAS` order); null when
 * every area is excluded for the day.
 */
export function lowestXpArea(
  summary: XpSummary,
  excludedAreas: LearningArea[] = [],
): LearningArea | null {
  const byArea = new Map(summary.areas.map(a => [a.area, a.xp]));
  const candidates = LEARNING_AREAS.filter(area => !excludedAreas.includes(area));
  let lowest: LearningArea | null = null;
  for (const area of candidates) {
    if (lowest === null || (byArea.get(area) ?? 0) < (byArea.get(lowest) ?? 0)) lowest = area;
  }
  return lowest;
}

/** Drop sections/resources whose media type is excluded today (unknown media types pass). */
function allowedByMediaType(mediaType: string | null, exclusions: LineupExclusions | undefined) {
  return !mediaType || !(exclusions?.mediaTypes ?? []).includes(mediaType);
}

/** True when a resource's complexity is inside the day's band (unrated resources pass when no band). */
function withinComplexity(
  resource: BookmarkResource | undefined,
  input: StartRecommendationInput,
): boolean {
  const scale = input.complexityScale ?? null;
  if (!scale || !resource) return true;
  const min = input.exclusions?.complexityMin ?? scale.min;
  const max = input.exclusions?.complexityMax ?? scale.max;
  return matchesComplexity(resource, min, max, scale);
}

/** The owning resource of a section, looked up by bookmark id. */
function sectionResource(
  section: BookmarkSectionMatch,
  input: StartRecommendationInput,
): BookmarkResource | undefined {
  return input.resourcesById?.[section.bookmarkId];
}

/**
 * Order resources by preference: locally-starred first, then upstream-favorited, then by content
 * status (actively-reading before finished/dropped), keeping list order within a tier. Stable.
 */
function orderResources(items: BookmarkResource[], favoriteIds: string[]): BookmarkResource[] {
  const rank = (r: BookmarkResource): [number, number] => [
    favoriteIds.includes(r.id) ? 0 : r.favorite ? 1 : 2,
    contentStatusRank(r.contentStatus),
  ];
  return [...items].sort((a, b) => {
    const [af, ac] = rank(a);
    const [bf, bc] = rank(b);
    return af - bf || ac - bc;
  });
}

/** Order sections by their owning resource's preference (favorite, then content status). */
function orderSections(
  items: BookmarkSectionMatch[],
  input: StartRecommendationInput,
  favoriteIds: string[],
): BookmarkSectionMatch[] {
  const rank = (s: BookmarkSectionMatch): [number, number] => {
    const r = sectionResource(s, input);
    return [
      favoriteIds.includes(s.bookmarkId) ? 0 : r?.favorite ? 1 : 2,
      contentStatusRank(r?.contentStatus ?? null),
    ];
  };
  return [...items].sort((a, b) => {
    const [af, ac] = rank(a);
    const [bf, bc] = rank(b);
    return af - bf || ac - bc;
  });
}

/**
 * Gate a bookmark's sections by its material type. Sequential-Material bookmarks only offer the first
 * not-yet-completed section (by `startValue` order) — don't skip ahead. Out-of-Order (or untagged)
 * bookmarks offer every section. Operates across a mixed-bookmark list, grouping by bookmark id.
 */
function gateSequentialSections(
  sections: BookmarkSectionMatch[],
  input: StartRecommendationInput,
): BookmarkSectionMatch[] {
  const materialTypeTags = input.materialTypeTags ?? {};
  const byBookmark = new Map<string, BookmarkSectionMatch[]>();
  for (const s of sections) {
    const list = byBookmark.get(s.bookmarkId) ?? [];
    list.push(s);
    byBookmark.set(s.bookmarkId, list);
  }
  const out: BookmarkSectionMatch[] = [];
  for (const [bookmarkId, group] of byBookmark) {
    const resource = input.resourcesById?.[bookmarkId];
    const sequential = resource
      && resourceMaterialTypes(resource.tagIds, materialTypeTags).includes("Sequential Material");
    if (!sequential) {
      out.push(...group);
      continue;
    }
    // Next actionable section = the first uncompleted one in document order.
    const ordered = [...group].sort((a, b) => {
      const av = parseStartValue(a.section.startValue);
      const bv = parseStartValue(b.section.startValue);
      if (av !== null && bv !== null) return av - bv;
      return a.section.label.localeCompare(b.section.label);
    });
    const next = ordered.find(s => !s.section.completed);
    if (next) out.push(next);
  }
  return out;
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
 * The concrete pick for one area. Prefers a tagged bookmark *section* (quick and contained), then a
 * whole tagged resource, then the bare session entry point. `section`/`resource` are the already
 * filtered-and-ordered top candidates for this area (empty for non-lowest areas → a bare link).
 */
function areaSuggestion(
  input: StartRecommendationInput,
  area: LearningArea,
  section: BookmarkSectionMatch | undefined,
  resource: BookmarkResource | undefined,
  why: string,
): StartSuggestion {
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

/** The "why this area" line, mentioning a matching goal and whether it's the lowest-XP area. */
function areaReason(input: StartRecommendationInput, area: LearningArea, isLowest: boolean): string {
  const goals = goalsForArea(input.profile, area);
  const lead = isLowest ? `${area} is your lowest area` : `Some ${area} practice`;
  return goals.length > 0 ? `${lead} and part of "${goals[0].title}".` : `${lead}.`;
}

/**
 * The ranked Start Something list: due sheets first, then a concrete pick for each non-excluded area
 * ordered by ascending XP (the lowest area gets the rich section/resource pick from the loaded pools;
 * the rest get their bare session link), then a starred grammar point and goal nudges. Returns the
 * whole pool — the page shows a window of it and rerolls through the rest.
 */
export function buildStartSuggestions(input: StartRecommendationInput): StartSuggestion[] {
  const {
    exclusions,
  } = input;
  const favoriteIds = input.favoriteResourceIds ?? [];

  // The lowest area's rich pools: drop excluded media types + out-of-band complexity, gate sequential
  // material to its next uncompleted section, then order by favorite + content status.
  const sections = orderSections(
    gateSequentialSections(
      (input.lowestAreaSections ?? [])
        .filter(s => allowedByMediaType(s.mediaType, exclusions))
        .filter(s => withinComplexity(sectionResource(s, input), input)),
      input,
    ),
    input,
    favoriteIds,
  );
  const resources = orderResources(
    (input.lowestAreaResources ?? [])
      .filter(r => allowedByMediaType(r.mediaType, exclusions))
      .filter(r => withinComplexity(r, input)),
    favoriteIds,
  );

  const suggestions: StartSuggestion[] = [...dueSheetSuggestions(input)];

  // One area pick per non-excluded area, lowest XP first. Only the lowest area gets the loaded pools.
  const excludedAreas = exclusions?.learningAreas ?? [];
  const byXp = new Map(input.summary.areas.map(a => [a.area, a.xp]));
  const rankedAreas = LEARNING_AREAS
    .filter(area => !excludedAreas.includes(area))
    .sort((a, b) => (byXp.get(a) ?? 0) - (byXp.get(b) ?? 0));
  rankedAreas.forEach((area, i) => {
    const isLowest = i === 0;
    suggestions.push(areaSuggestion(
      input,
      area,
      isLowest ? sections[0] : undefined,
      isLowest ? resources[0] : undefined,
      areaReason(input, area, isLowest),
    ));
  });

  // Track grammar-note ids already used so the starred/goal slots don't repeat an area pick.
  const usedNoteIds = new Set<string>(
    suggestions.flatMap(s => (s.to === "/grammar-notes/$id" && s.params ? [s.params.id] : [])),
  );
  const starred = starredGrammarSuggestion(input, usedNoteIds);
  if (starred) {
    if (starred.params) usedNoteIds.add(starred.params.id);
    suggestions.push(starred);
  }
  suggestions.push(...goalSuggestions(input, usedNoteIds));

  // Finally, drop anything pointing at an activity excluded for today, or a non-due suggestion for an
  // excluded area (due sheets map to no session type and always surface — deadlines win).
  const excludedRoutes = new Set(
    (exclusions?.sessionTypes ?? []).flatMap(type => SESSION_TYPE_ROUTES[type]),
  );
  return suggestions.filter(s =>
    !excludedRoutes.has(s.to)
    && !(s.area && excludedAreas.includes(s.area) && s.kind !== "due-sheet"));
}
