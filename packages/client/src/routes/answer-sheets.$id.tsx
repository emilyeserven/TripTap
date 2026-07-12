import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single answer sheet. It only renders its child route — the read-only view
 * (`/answer-sheets/$id/`) or the edit form (`/answer-sheets/$id/edit`).
 */
export const Route = createFileRoute("/answer-sheets/$id")({
  component: AnswerSheetIdLayout,
});

function AnswerSheetIdLayout() {
  return <Outlet />;
}
