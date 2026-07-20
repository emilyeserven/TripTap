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
import { matchesComplexity, resourceLearningAreas, resourceMaterialTypes } from "@/lib/collections";
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
  /** Every bookmark section (the Start Something pool). */
  sections?: BookmarkSectionMatch[];
  /** Every Collections resource (the whole pool, with custom properties). */
  resources?: BookmarkResource[];
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

/** The session route + verb for consuming a resource in a given area (defaults to reading it). */
function sessionLinkFor(area: LearningArea | null): { to: string;
  verb: string; } {
  switch (area) {
    case "Speaking": return {
      to: "/shadowing/new",
      verb: "Shadow",
    };
    case "Listening": return {
      to: "/listening-sessions/new",
      verb: "Listen to",
    };
    case "Reading": return {
      to: "/reading-sessions/new",
      verb: "Read",
    };
    default: return {
      to: "/reading-sessions/new",
      verb: "Study",
    };
  }
}

/** Link search params prefilling the session form for `to` from a bookmark. */
function sessionSearch(
  to: string,
  bookmarkId: string,
  bookmarkTitle: string,
  bookmarkUrl: string | null,
): Record<string, string> {
  if (to === "/reading-sessions/new") return {
    title: bookmarkTitle,
  };
  return {
    bookmarkId,
    bookmarkTitle,
    ...(bookmarkUrl
      ? {
        bookmarkUrl,
      }
      : {}),
  };
}

/**
 * The area a resource is practiced in: the lowest-XP of its (non-excluded) mapped learning areas, so
 * suggestions nudge toward neglected skills. Returns `null` when the resource maps to no area (still
 * suggestable, generically), or `"excluded"` when every one of its areas is excluded today.
 */
function resourceArea(
  resource: BookmarkResource,
  input: StartRecommendationInput,
): LearningArea | null | "excluded" {
  const excluded = input.exclusions?.learningAreas ?? [];
  const areas = resourceLearningAreas(resource.tagIds, input.areaTags ?? {});
  if (areas.length === 0) return null;
  const usable = areas.filter(a => !excluded.includes(a));
  if (usable.length === 0) return "excluded";
  const byXp = new Map(input.summary.areas.map(a => [a.area, a.xp]));
  return usable.reduce((lowest, a) => ((byXp.get(a) ?? 0) < (byXp.get(lowest) ?? 0) ? a : lowest));
}

/** A sortable rank for a content pick: neglected area first, then favorite, then content status. */
function contentRank(
  resource: BookmarkResource | undefined,
  area: LearningArea | null,
  input: StartRecommendationInput,
  favoriteIds: string[],
): [number, number, number] {
  const byXp = new Map(input.summary.areas.map(a => [a.area, a.xp]));
  return [
    area ? byXp.get(area) ?? 0 : Number.MAX_SAFE_INTEGER,
    resource && favoriteIds.includes(resource.id) ? 0 : resource?.favorite ? 1 : 2,
    contentStatusRank(resource?.contentStatus ?? null),
  ];
}

interface ContentPick {
  suggestion: StartSuggestion;
  rank: [number, number, number];
  bookmarkId: string;
}

/**
 * Round-robin content picks across their owning bookmarks so consecutive suggestions come from
 * different resources — otherwise one section-heavy book dominates the whole list. Bookmarks keep
 * their rank order (best resource's first item still leads); within a bookmark, section order holds.
 */
function interleaveByBookmark(picks: ContentPick[]): ContentPick[] {
  const queues = new Map<string, ContentPick[]>();
  const order: string[] = [];
  for (const pick of picks) {
    const q = queues.get(pick.bookmarkId);
    if (q) {
      q.push(pick);
    }
    else {
      queues.set(pick.bookmarkId, [pick]);
      order.push(pick.bookmarkId);
    }
  }
  const out: ContentPick[] = [];
  let dealt = true;
  while (dealt) {
    dealt = false;
    for (const bookmarkId of order) {
      const next = queues.get(bookmarkId)?.shift();
      if (next) {
        out.push(next);
        dealt = true;
      }
    }
  }
  return out;
}

/**
 * Turn every resource (and its sections) into suggestions. A resource with usable sections yields one
 * suggestion per section; a section-less resource yields one whole-resource suggestion. Filters by the
 * day's exclusions (media type, complexity, learning area) and gates Sequential-Material resources to
 * their next uncompleted section.
 */
function contentSuggestions(input: StartRecommendationInput, favoriteIds: string[]): ContentPick[] {
  const {
    exclusions,
  } = input;
  const sectionsByBookmark = new Map<string, BookmarkSectionMatch[]>();
  for (const s of input.sections ?? []) {
    const list = sectionsByBookmark.get(s.bookmarkId) ?? [];
    list.push(s);
    sectionsByBookmark.set(s.bookmarkId, list);
  }

  const picks: ContentPick[] = [];
  for (const resource of input.resources ?? []) {
    if (!allowedByMediaType(resource.mediaType, exclusions)) continue;
    if (!withinComplexity(resource, input)) continue;
    const area = resourceArea(resource, input);
    if (area === "excluded") continue;

    const {
      to, verb,
    } = sessionLinkFor(area);
    // If today's session type for this area is excluded, skip the whole resource.
    if ((exclusions?.sessionTypes ?? []).some(type => SESSION_TYPE_ROUTES[type].includes(to))) continue;

    const sections = gateSequentialSections(sectionsByBookmark.get(resource.id) ?? [], input);
    if (sections.length > 0) {
      for (const match of sections) {
        picks.push({
          suggestion: {
            id: `section-${match.section.id}`,
            kind: "area",
            area,
            title: `${verb} "${match.section.label}" of ${resource.title}`,
            description: area ? `${area} practice from your resources.` : "From your resources.",
            to,
            search: sessionSearch(to, resource.id, resource.title, resource.url),
          },
          rank: contentRank(resource, area, input, favoriteIds),
          bookmarkId: resource.id,
        });
      }
    }
    else {
      picks.push({
        suggestion: {
          id: `resource-${resource.id}`,
          kind: "area",
          area,
          title: `${verb} a bit of ${resource.title}`,
          description: area ? `${area} practice from your resources.` : "From your resources.",
          to,
          search: sessionSearch(to, resource.id, resource.title, resource.url),
        },
        rank: contentRank(resource, area, input, favoriteIds),
        bookmarkId: resource.id,
      });
    }
  }
  return picks;
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
  const excludedAreas = exclusions?.learningAreas ?? [];
  const byXp = new Map(input.summary.areas.map(a => [a.area, a.xp]));

  const suggestions: StartSuggestion[] = [...dueSheetSuggestions(input)];

  // Every resource + section becomes a candidate, ordered neglected-area-first, then favorite, then
  // content status — then round-robined across bookmarks so the reroll window is varied rather than
  // three sections of the same book.
  const ranked = contentSuggestions(input, favoriteIds).sort((a, b) => {
    for (let i = 0; i < a.rank.length; i++) {
      if (a.rank[i] !== b.rank[i]) return a.rank[i] - b.rank[i];
    }
    return 0;
  });
  suggestions.push(...interleaveByBookmark(ranked).map(p => p.suggestion));

  // Built-in per-area picks (generic session link, or a writing prompt / grammar note / practice pass
  // for areas Resources don't cover), one per non-excluded area, lowest XP first — baseline variety.
  const rankedAreas = LEARNING_AREAS
    .filter(area => !excludedAreas.includes(area))
    .sort((a, b) => (byXp.get(a) ?? 0) - (byXp.get(b) ?? 0));
  rankedAreas.forEach((area, i) => {
    suggestions.push(areaSuggestion(input, area, undefined, undefined, areaReason(input, area, i === 0)));
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

  // Dedupe by id, then drop anything pointing at an activity excluded for today, or a non-due
  // suggestion for an excluded area (due sheets map to no session type and always surface).
  const seen = new Set<string>();
  const excludedRoutes = new Set(
    (exclusions?.sessionTypes ?? []).flatMap(type => SESSION_TYPE_ROUTES[type]),
  );
  return suggestions.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return !excludedRoutes.has(s.to)
      && !(s.area && excludedAreas.includes(s.area) && s.kind !== "due-sheet");
  });
}
