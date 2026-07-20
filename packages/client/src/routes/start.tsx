import type { StartSuggestion } from "@/lib/start-recommendations";
import type * as React from "react";

import { useMemo } from "react";

import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookAIcon,
  BookOpenIcon,
  CameraIcon,
  DrillIcon,
  HeadphonesIcon,
  PenLineIcon,
  Repeat2Icon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";

import { DueSoonCard } from "@/components/DueSoonCard";
import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XpBreakdown } from "@/components/XpBreakdown";
import { XpRadarChart } from "@/components/XpRadarChart";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useBookmarksByTag, useBookmarkSectionsByTag } from "@/hooks/useBookmarks";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { useLearnerProfile, useBookmarksSettings } from "@/hooks/useSettings";
import { useWritingPrompts } from "@/hooks/useWritingPrompts";
import { useXpSummary } from "@/hooks/useXp";
import { buildStartSuggestions, lowestXpArea } from "@/lib/start-recommendations";

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
}: {
  suggestion: StartSuggestion;
}) {
  return (
    <Link
      {...suggestionLinkProps(suggestion)}
      className="
        flex items-center justify-between gap-2 rounded-md border p-3 text-sm
        transition-colors
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

  const areaTags = bookmarksSettings.data?.learningAreaTags ?? {};
  const lowest = summary.data ? lowestXpArea(summary.data) : null;
  // The lowest area's mapped tag drives the "quick and contained" section/resource pool. The hooks
  // no-op on a null tag id (e.g. the tag map isn't configured), degrading to bare session links.
  const lowestTagId = lowest ? areaTags[lowest]?.id ?? null : null;
  const areaSections = useBookmarkSectionsByTag(lowestTagId);
  const areaResources = useBookmarksByTag(lowestTagId);

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
      lowestAreaSections: areaSections.data,
      lowestAreaResources: areaResources.data,
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
    areaSections.data,
    areaResources.data,
  ]);

  const [hero, ...rest] = suggestions;
  const goals = profile.data?.goals ?? [];

  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Something quick and contained, picked from your goals and the learning area with the least
        XP.
      </p>

      {hero
        ? (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SparklesIcon className="size-4" />
                Up next
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SuggestionRow suggestion={hero} />
              {rest.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Or pick another:</p>
                  {rest.map(s => (
                    <SuggestionRow
                      key={s.id}
                      suggestion={s}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
        : (
          <p className="text-sm text-muted-foreground">
            {summary.isLoading ? "Working out what to suggest…" : "Nothing to suggest yet — log some practice first."}
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
              ? <XpRadarChart areas={summary.data.areas} />
              : <p className="text-sm text-muted-foreground">Loading XP…</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.data
              ? <XpBreakdown summary={summary.data} />
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
