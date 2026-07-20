import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AnswerSheetCard } from "@/components/AnswerSheetCard";
import { HubSection } from "@/components/HubSection";
import { QuestionSheetCard } from "@/components/QuestionSheetCard";
import { ResourceRow } from "@/components/ResourceRow";
import { SheetFilters } from "@/components/SheetFilters";
import { Button } from "@/components/ui/button";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useBookmarkResources } from "@/hooks/useBookmarks";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { useBookmarksSettings } from "@/hooks/useSettings";
import {
  ALL_FILTER,
  matchesLearningArea,
  matchesResource,
  resourceFilterOptions,
} from "@/lib/answer-sheets";

export const Route = createFileRoute("/book-exercises/")({
  component: BookExercisesPage,
});

const VIEW_ALL_CLASS = "text-sm font-medium text-primary hover:underline";

function BookExercisesPage() {
  usePageTitle("Book Exercises");
  const {
    data: questionSheets, isLoading: questionSheetsLoading, error: questionSheetsError,
  } = useQuestionSheets();

  const {
    data: answerSheets, isLoading: answerSheetsLoading, error: answerSheetsError,
  } = useAnswerSheets();
  const bookmarkResources = useBookmarkResources();
  const bookmarksSettings = useBookmarksSettings();

  const [resource, setResource] = useState(ALL_FILTER);
  const [area, setArea] = useState(ALL_FILTER);

  const areaTags = useMemo(() => bookmarksSettings.data?.learningAreaTags ?? {}, [bookmarksSettings.data]);
  const bookResources = useMemo(
    () => (bookmarkResources.data?.resources ?? []).filter(r => r.mediaType === "Book"),
    [bookmarkResources.data],
  );

  const parentById = useMemo(
    () => new Map((questionSheets ?? []).map(q => [q.id, q])),
    [questionSheets],
  );
  const resourceOptions = useMemo(
    () => resourceFilterOptions(questionSheets ?? []),
    [questionSheets],
  );

  const shownQuestionSheets = useMemo(
    () => (questionSheets ?? []).filter(
      qs => matchesResource(qs, resource) && matchesLearningArea(qs, area),
    ),
    [questionSheets, resource, area],
  );
  // Answer sheets inherit resource/learning-area from their parent question sheet.
  const shownAnswerSheets = useMemo(
    () => (answerSheets ?? []).filter((as) => {
      const parent = parentById.get(as.questionSheetId);
      return matchesResource(parent, resource) && matchesLearningArea(parent, area);
    }),
    [answerSheets, parentById, resource, area],
  );

  return (
    <section className="max-w-4xl space-y-10">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Question sheets and answer sheets for working through textbook exercises.
        </p>
        <SheetFilters
          resource={resource}
          onResourceChange={setResource}
          resourceOptions={resourceOptions}
          area={area}
          onAreaChange={setArea}
        />
      </div>

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

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Question Sheets</h2>
          <Button
            asChild
            size="sm"
          >
            <Link to="/question-sheets/new">
              <Plus className="size-4" />
              New question sheet
            </Link>
          </Button>
        </div>

        {questionSheetsError ? <p className="text-destructive">{questionSheetsError.message}</p> : null}
        {questionSheetsLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {!questionSheetsLoading && shownQuestionSheets.length === 0 && (
          <p className="text-muted-foreground">No question sheets yet.</p>
        )}

        <div
          className="
            grid gap-4
            sm:grid-cols-2
          "
        >
          {shownQuestionSheets.map(qs => (
            <QuestionSheetCard
              key={qs.id}
              questionSheet={qs}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Answer Sheets</h2>
          <Button
            asChild
            size="sm"
          >
            <Link to="/answer-sheets/new">
              <Plus className="size-4" />
              New answer sheet
            </Link>
          </Button>
        </div>

        {answerSheetsError ? <p className="text-destructive">{answerSheetsError.message}</p> : null}
        {answerSheetsLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {!answerSheetsLoading && shownAnswerSheets.length === 0 && (
          <p className="text-muted-foreground">No answer sheets yet.</p>
        )}

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
      </div>
    </section>
  );
}
