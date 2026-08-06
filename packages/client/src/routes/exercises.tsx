import { useMemo, useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AnswerSheetCard } from "@/components/AnswerSheetCard";
import { HubSection } from "@/components/HubSection";
import { QuestionSheetResourceGroup } from "@/components/QuestionSheetResourceGroup";
import { ResourceRow } from "@/components/ResourceRow";
import { SheetFilters } from "@/components/SheetFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useAllBookmarkSections, useBookmarkResources } from "@/hooks/useBookmarks";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { useBookmarksSettings } from "@/hooks/useSettings";
import {
  ALL_FILTER,
  matchesLearningArea,
  matchesResource,
  resourceFilterOptions,
} from "@/lib/answer-sheets";
import { buildTocIndex, groupSheetsByResource } from "@/lib/question-sheets";

type ExercisesTab = "questions" | "answers";

export const Route = createFileRoute("/exercises")({
  // `?tab=` deep-links a specific tab (the retired question-/answer-sheets list routes redirect here).
  validateSearch: (search: Record<string, unknown>): { tab?: ExercisesTab } => (
    search.tab === "questions" || search.tab === "answers"
      ? {
        tab: search.tab,
      }
      : {}
  ),
  component: ExercisesPage,
});

const VIEW_ALL_CLASS = "text-sm font-medium text-primary hover:underline";

/**
 * The single destination for textbook/worksheet exercises, replacing the Book Exercises / Question
 * Sheets / Answer Sheets trio: the Books resource row on top, then the two sheet lists as tabs
 * sharing one resource/learning-area filter. The question tab keeps the TOC-ordered per-resource
 * grouping; detail routes (`/question-sheets/$id`, `/answer-sheets/$id`, …) are unchanged.
 */
function ExercisesPage() {
  usePageTitle("Exercises");
  const navigate = useNavigate();
  const {
    tab = "questions",
  } = Route.useSearch();

  const {
    data: questionSheets, isLoading: questionSheetsLoading, error: questionSheetsError,
  } = useQuestionSheets();
  const {
    data: answerSheets, isLoading: answerSheetsLoading, error: answerSheetsError,
  } = useAnswerSheets();
  const bookmarkResources = useBookmarkResources();
  const bookmarksSettings = useBookmarksSettings();

  const [search, setSearch] = useState("");
  const [resource, setResource] = useState(ALL_FILTER);
  const [area, setArea] = useState(ALL_FILTER);

  const areaTags = useMemo(() => bookmarksSettings.data?.learningAreaTags ?? {}, [bookmarksSettings.data]);
  const bookResources = useMemo(
    () => (bookmarkResources.data?.resources ?? []).filter(r => r.mediaType === "Book"),
    [bookmarkResources.data],
  );

  // Live resource metadata (current title, cover image, media type) keyed by bookmark id.
  const recordById = useMemo(
    () => new Map((bookmarkResources.data?.resources ?? []).map(r => [r.id, r] as const)),
    [bookmarkResources.data],
  );
  // Per-resource TOC order, so each group's sheets read in the book's reading order.
  const {
    data: allSections,
  } = useAllBookmarkSections();
  const tocIndex = useMemo(() => buildTocIndex(allSections ?? []), [allSections]);

  const parentById = useMemo(
    () => new Map((questionSheets ?? []).map(q => [q.id, q])),
    [questionSheets],
  );
  const resourceOptions = useMemo(
    () => resourceFilterOptions(questionSheets ?? []),
    [questionSheets],
  );

  const shownQuestionSheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (questionSheets ?? []).filter((s) => {
      if (q && !s.title.toLowerCase().includes(q) && !(s.notes ?? "").toLowerCase().includes(q)) {
        return false;
      }
      return matchesResource(s, resource) && matchesLearningArea(s, area);
    });
  }, [questionSheets, search, resource, area]);

  const questionGroups = useMemo(
    () => groupSheetsByResource(shownQuestionSheets, tocIndex),
    [shownQuestionSheets, tocIndex],
  );

  // Answer sheets inherit resource/learning-area from their parent question sheet.
  const shownAnswerSheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (answerSheets ?? []).filter((s) => {
      if (q && !(s.title ?? "").toLowerCase().includes(q)) return false;
      const parent = parentById.get(s.questionSheetId);
      return matchesResource(parent, resource) && matchesLearningArea(parent, area);
    });
  }, [answerSheets, search, resource, area, parentById]);

  const setTab = (next: string) => {
    void navigate({
      to: "/exercises",
      search: next === "answers"
        ? {
          tab: "answers",
        }
        : {},
      replace: true,
    });
  };

  return (
    <section className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Question sheets and answer sheets for working through textbook exercises. Build a question
        sheet once, then answer it as many times as you like.
      </p>

      <HubSection
        title="Books"
        action={(
          <Link
            to="/collections"
            search={{
              mediaType: "Book",
            }}
            className={VIEW_ALL_CLASS}
          >
            View more →
          </Link>
        )}
      >
        <ResourceRow
          resources={bookResources}
          areaTags={areaTags}
          emptyText="No Book resources yet."
        />
      </HubSection>

      <Tabs
        value={tab}
        onValueChange={setTab}
      >
        <TabsList>
          <TabsTrigger value="questions">Question Sheets</TabsTrigger>
          <TabsTrigger value="answers">Answer Sheets</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === "questions" ? "Search question sheets…" : "Search answer sheets…"}
          aria-label={tab === "questions" ? "Search question sheets" : "Search answer sheets"}
          className="max-w-sm"
        />
        <SheetFilters
          resource={resource}
          onResourceChange={setResource}
          resourceOptions={resourceOptions}
          area={area}
          onAreaChange={setArea}
        />
        <div className="ml-auto">
          {tab === "questions"
            ? (
              <Button asChild>
                <Link to="/question-sheets/new">
                  <Plus className="size-4" />
                  New question sheet
                </Link>
              </Button>
            )
            : (
              <Button asChild>
                <Link to="/answer-sheets/new">
                  <Plus className="size-4" />
                  New answer sheet
                </Link>
              </Button>
            )}
        </div>
      </div>

      {tab === "questions"
        ? (
          <>
            {questionSheetsError
              ? <p className="text-destructive">{questionSheetsError.message}</p>
              : null}
            {questionSheetsLoading ? <p className="text-muted-foreground">Loading…</p> : null}
            {!questionSheetsLoading && shownQuestionSheets.length === 0
              ? (
                <p className="text-muted-foreground">
                  No question sheets yet. Create one with “New question sheet”.
                </p>
              )
              : null}
            <ul
              className="
                grid gap-4
                sm:grid-cols-2
              "
            >
              {questionGroups.map((group) => {
                const record = group.bookmarkId ? recordById.get(group.bookmarkId) : undefined;
                return (
                  <QuestionSheetResourceGroup
                    key={group.bookmarkId ?? "__none__"}
                    bookmarkId={group.bookmarkId}
                    bookmarkTitle={record?.title ?? group.sheets[0]?.bookmarkTitle ?? null}
                    bookmarkUrl={record?.url ?? group.sheets[0]?.bookmarkUrl ?? null}
                    imageUrl={record?.imageUrl ?? null}
                    mediaType={record?.mediaType ?? null}
                    sheets={group.sheets}
                  />
                );
              })}
            </ul>
          </>
        )
        : (
          <>
            {answerSheetsError ? <p className="text-destructive">{answerSheetsError.message}</p> : null}
            {answerSheetsLoading ? <p className="text-muted-foreground">Loading…</p> : null}
            {!answerSheetsLoading && shownAnswerSheets.length === 0
              ? (
                <p className="text-muted-foreground">
                  No answer sheets yet. Create one with “New answer sheet”, or answer a question
                  sheet directly.
                </p>
              )
              : null}
            <div
              className="
                grid gap-4
                sm:grid-cols-2
              "
            >
              {shownAnswerSheets.map(as => (
                <AnswerSheetCard
                  key={as.id}
                  answerSheet={as}
                />
              ))}
            </div>
          </>
        )}
    </section>
  );
}
