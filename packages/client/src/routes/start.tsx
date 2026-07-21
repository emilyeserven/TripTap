import type { XpBreakdownView } from "@/components/XpBreakdown";
import type { StartSuggestion } from "@/lib/start-recommendations";
import type { BookmarkSectionMatch } from "@sentence-bank/types";
import type * as React from "react";

import { useMemo, useState } from "react";

import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookAIcon,
  BookOpenIcon,
  CameraIcon,
  DrillIcon,
  HeadphonesIcon,
  ListPlusIcon,
  PenLineIcon,
  RefreshCwIcon,
  Repeat2Icon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";

import { DailyGoalProgress } from "@/components/DailyGoalProgress";
import { DailyLineupCard } from "@/components/DailyLineupCard";
import { DueSoonCard } from "@/components/DueSoonCard";
import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XpBreakdown } from "@/components/XpBreakdown";
import { XpRadarChart } from "@/components/XpRadarChart";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useAllBookmarkSections, useBookmarkResources } from "@/hooks/useBookmarks";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import {
  useBookmarksSettings,
  useLearnerProfile,
  useStartSettings,
  useUpdateStartSettings,
} from "@/hooks/useSettings";
import { useWritingPrompts } from "@/hooks/useWritingPrompts";
import { useXpSummary } from "@/hooks/useXp";
import {
  effectiveLineup,
  suggestionToLineupItem,
  todayDateString,
} from "@/lib/daily-lineup";
import { buildStartSuggestions } from "@/lib/start-recommendations";

export const Route = createFileRoute("/start")({
  component: StartPage,
});

/** The always-available entry points, for when none of the suggestions is what you want. */
const QUICK_STARTS = [
  {
    title: "Capture",
    to: "/capture",
    icon: CameraIcon,
  },
  {
    title: "Lesson",
    to: "/lessons/new",
    icon: BookAIcon,
  },
  {
    title: "Drills",
    to: "/drill-sessions/new",
    icon: DrillIcon,
  },
  {
    title: "Writing",
    to: "/my-writing",
    icon: PenLineIcon,
  },
  {
    title: "Reading",
    to: "/reading-sessions/new",
    icon: BookOpenIcon,
  },
  {
    title: "Listening",
    to: "/listening-sessions/new",
    icon: HeadphonesIcon,
  },
  {
    title: "Shadowing",
    to: "/shadowing/new",
    icon: Repeat2Icon,
  },
] as const;

/** Route a suggestion's untyped link data into a typed `Link`. */
function suggestionLinkProps(s: StartSuggestion): React.ComponentProps<typeof Link> {
  return {
    to: s.to,
    params: s.params,
    search: s.search,
  } as unknown as React.ComponentProps<typeof Link>;
}

function SuggestionRow({
  suggestion,
  inLineup,
  onAddToLineup,
}: {
  suggestion: StartSuggestion;
  inLineup: boolean;
  onAddToLineup: (suggestion: StartSuggestion) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        {...suggestionLinkProps(suggestion)}
        className="
          flex flex-1 items-center justify-between gap-2 rounded-md border p-3
          text-sm transition-colors
          hover:bg-accent
        "
      >
        <span className="space-y-0.5">
          <span className="block font-medium">{suggestion.title}</span>
          {suggestion.description && (
            <span className="block text-xs text-muted-foreground">{suggestion.description}</span>
          )}
        </span>
        {suggestion.area && <LearningAreaBadges areas={[suggestion.area]} />}
      </Link>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={inLineup
          ? `"${suggestion.title}" is already in today's lineup`
          : `Add "${suggestion.title}" to today's lineup`}
        title="Add to today's lineup"
        disabled={inLineup}
        onClick={() => onAddToLineup(suggestion)}
      >
        <ListPlusIcon className="size-4" />
      </Button>
    </div>
  );
}

function StartPage() {
  usePageTitle("Start Something");

  const summary = useXpSummary();
  const profile = useLearnerProfile();
  const questionSheets = useQuestionSheets();
  const answerSheets = useAnswerSheets();
  const grammarNotes = useGrammarNotes();
  const writingPrompts = useWritingPrompts();
  const bookmarksSettings = useBookmarksSettings();
  const startSettings = useStartSettings();
  const updateStartSettings = useUpdateStartSettings();

  const today = todayDateString(new Date());
  // The stored lineup only counts when it was built for today; a stale one reads as an empty day.
  const lineup = effectiveLineup(startSettings.data?.lineup ?? null, today);
  const favoriteResourceIds = startSettings.data?.favoriteResourceIds ?? [];
  const persistLineup = (next: typeof lineup) => {
    updateStartSettings.mutate({
      lineup: {
        ...next,
        date: today,
      },
    });
  };

  const areaTags = bookmarksSettings.data?.learningAreaTags ?? {};
  const materialTypeTags = bookmarksSettings.data?.materialTypeTags ?? {};
  // The whole Collections resource list (with complexity/favorite/content status) and every bookmark
  // section are the suggestion pool — the ranker turns each into a candidate to reroll through.
  const allResources = useBookmarkResources();
  const allSections = useAllBookmarkSections();
  const resources = useMemo(() => allResources.data?.resources ?? [], [allResources.data]);
  const resourcesById = useMemo(
    () => Object.fromEntries(resources.map(r => [r.id, r])),
    [resources],
  );
  // Sections grouped by owning bookmark, for the lineup editor's per-item "swap section" picker.
  const sectionsByResource = useMemo(() => {
    const map: Record<string, BookmarkSectionMatch[]> = {};
    for (const s of allSections.data ?? []) (map[s.bookmarkId] ??= []).push(s);
    return map;
  }, [allSections.data]);

  const suggestions = useMemo(() => {
    if (!summary.data) return [];
    return buildStartSuggestions({
      summary: summary.data,
      profile: profile.data,
      questionSheets: questionSheets.data,
      answerSheets: answerSheets.data,
      grammarNotes: grammarNotes.data,
      writingPrompts: writingPrompts.data,
      areaTags,
      sections: allSections.data,
      resources,
      resourcesById,
      materialTypeTags,
      complexityScale: allResources.data?.complexityScale ?? null,
      exclusions: lineup.exclusions,
      favoriteResourceIds,
      now: new Date(),
    });
  }, [
    summary.data,
    profile.data,
    questionSheets.data,
    answerSheets.data,
    grammarNotes.data,
    writingPrompts.data,
    areaTags,
    allSections.data,
    resources,
    resourcesById,
    materialTypeTags,
    allResources.data,
    lineup.exclusions,
    favoriteResourceIds,
  ]);

  // Media-type chips draw from every resource in Collections, not just the current area's pool.
  const mediaTypeOptions = useMemo(
    () => [...new Set(resources.map(r => r.mediaType).filter((m): m is string => Boolean(m)))],
    [resources],
  );

  const lineupIds = new Set(lineup.items.map(item => item.id));
  const addToLineup = (suggestion: StartSuggestion) => {
    if (lineupIds.has(suggestion.id)) return;
    persistLineup({
      ...lineup,
      items: [...lineup.items, suggestionToLineupItem(suggestion)],
    });
  };

  // Up Next shows a window of the pool, excluding anything already locked into the lineup; Reroll
  // advances the window (wrapping) so the learner can cycle through the alternatives.
  const available = suggestions.filter(s => !lineupIds.has(s.id));
  const [rerollOffset, setRerollOffset] = useState(0);
  const [breakdownView, setBreakdownView] = useState<XpBreakdownView>("all-time");
  const UP_NEXT_COUNT = 3;
  const start = available.length > 0 ? rerollOffset % available.length : 0;
  const upNext = available.length <= UP_NEXT_COUNT
    ? available
    : Array.from({
      length: UP_NEXT_COUNT,
    }, (_, i) => available[(start + i) % available.length]);
  const goals = profile.data?.goals ?? [];

  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Something quick and contained, picked from your goals and the learning area with the least
        XP.
      </p>

      {summary.data && (
        <DailyGoalProgress
          todayXp={summary.data.today.totalXp}
          dailyXpGoal={profile.data?.dailyXpGoal ?? null}
        />
      )}

      <DailyLineupCard
        lineup={lineup}
        mediaTypeOptions={mediaTypeOptions}
        complexityScale={allResources.data?.complexityScale ?? null}
        resources={resources}
        sectionsByResource={sectionsByResource}
        onChange={persistLineup}
      />

      {upNext.length > 0
        ? (
          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <SparklesIcon className="size-4" />
                Up next
              </CardTitle>
              {available.length > UP_NEXT_COUNT && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRerollOffset(o => o + UP_NEXT_COUNT)}
                >
                  <RefreshCwIcon className="size-4" />
                  Reroll
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {upNext.map(s => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  inLineup={false}
                  onAddToLineup={addToLineup}
                />
              ))}
            </CardContent>
          </Card>
        )
        : (
          <p className="text-sm text-muted-foreground">
            {summary.isLoading
              ? "Working out what to suggest…"
              : "Nothing to suggest right now — everything's in your lineup, or log some practice first."}
          </p>
        )}

      <div className="flex flex-wrap gap-2">
        {QUICK_STARTS.map(item => (
          <Button
            key={item.title}
            asChild
            variant="outline"
            size="sm"
          >
            <Link to={item.to}>
              <item.icon className="size-4" />
              {item.title}
            </Link>
          </Button>
        ))}
      </div>

      <div
        className="
          grid gap-6
          lg:grid-cols-2
        "
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XP by learning area</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.data
              ? (
                <XpRadarChart
                  areas={summary.data.areas}
                  todayAreas={summary.data.today.areas}
                />
              )
              : <p className="text-sm text-muted-foreground">Loading XP…</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.data
              ? (
                <XpBreakdown
                  summary={summary.data}
                  view={breakdownView}
                  onViewChange={setBreakdownView}
                />
              )
              : <p className="text-sm text-muted-foreground">Loading XP…</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="size-4" />
            Your goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {goals.length === 0
            ? (
              <p className="text-sm text-muted-foreground">
                No goals set.
                {" "}
                <Link
                  to="/profile"
                  className="
                    text-primary
                    hover:underline
                  "
                >
                  Set up to three
                </Link>
                {" "}
                to steer these suggestions.
              </p>
            )
            : (
              <>
                {goals.map(goal => (
                  <div
                    key={goal.id}
                    className="
                      flex items-center justify-between gap-2 rounded-md border
                      p-2 text-sm
                    "
                  >
                    <span className="space-y-0.5">
                      <span className="block font-medium">{goal.title}</span>
                      {goal.notes && (
                        <span className="block text-xs text-muted-foreground">{goal.notes}</span>
                      )}
                    </span>
                    {goal.learningAreas.length > 0 && (
                      <LearningAreaBadges areas={goal.learningAreas} />
                    )}
                  </div>
                ))}
                <Link
                  to="/profile"
                  className="
                    text-sm text-primary
                    hover:underline
                  "
                >
                  Edit goals
                </Link>
              </>
            )}
        </CardContent>
      </Card>

      <DueSoonCard />
    </section>
  );
}
