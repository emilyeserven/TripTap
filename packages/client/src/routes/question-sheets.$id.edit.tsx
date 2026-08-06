import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { QuestionSheetForm } from "@/components/QuestionSheetForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteQuestionSheet, useQuestionSheet } from "@/hooks/useQuestionSheets";

export const Route = createFileRoute("/question-sheets/$id/edit")({
  component: EditQuestionSheetPage,
});

function EditQuestionSheetPage() {
  usePageTitle("Edit question sheet");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteQuestionSheet();

  return (
    <EntityEditPage
      query={useQuestionSheet(id)}
      noun="Question sheet"
      backLink={(
        <Link
          to="/question-sheets/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to question sheet
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/exercises",
            search: {
              tab: "questions",
            },
          }),
        })}
    >
      {entity => (
        <QuestionSheetForm
          questionSheet={entity}
          onSuccess={() =>
            navigate({
              to: "/question-sheets/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
