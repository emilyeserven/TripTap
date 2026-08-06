import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { AnswerSheetForm } from "@/components/AnswerSheetForm";
import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { useAnswerSheet, useDeleteAnswerSheet } from "@/hooks/useAnswerSheets";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/answer-sheets/$id/edit")({
  validateSearch: (search: Record<string, unknown>): { part?: string } => ({
    part: typeof search.part === "string" ? search.part : undefined,
  }),
  component: EditAnswerSheetPage,
});

function EditAnswerSheetPage() {
  usePageTitle("Edit answer sheet");
  const {
    id,
  } = Route.useParams();
  const {
    part,
  } = Route.useSearch();
  const navigate = useNavigate();
  const remove = useDeleteAnswerSheet();

  return (
    <EntityEditPage
      query={useAnswerSheet(id)}
      noun="Answer sheet"
      backLink={(
        <Link
          to="/answer-sheets/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Done — back to answer sheet
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/exercises",
            search: {
              tab: "answers",
            },
          }),
        })}
    >
      {/* The form autosaves, so there's no onSuccess — `activePart` scopes it to one part. */}
      {answerSheet => (
        <AnswerSheetForm
          answerSheet={answerSheet}
          activePart={part ?? null}
        />
      )}
    </EntityEditPage>
  );
}
