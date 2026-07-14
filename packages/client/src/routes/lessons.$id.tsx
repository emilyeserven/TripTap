import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single lesson. It only renders its child route — the read-only view
 * (`/lessons/$id/`) or the edit form (`/lessons/$id/edit`).
 */
export const Route = createFileRoute("/lessons/$id")({
  component: LessonIdLayout,
});

function LessonIdLayout() {
  return <Outlet />;
}
