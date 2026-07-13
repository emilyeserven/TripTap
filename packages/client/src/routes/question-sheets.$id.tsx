import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single question sheet. It only renders its child route — the read-only view
 * (`/question-sheets/$id/`) or the edit form (`/question-sheets/$id/edit`).
 */
export const Route = createFileRoute("/question-sheets/$id")({
  component: QuestionSheetIdLayout,
});

function QuestionSheetIdLayout() {
  return <Outlet />;
}
