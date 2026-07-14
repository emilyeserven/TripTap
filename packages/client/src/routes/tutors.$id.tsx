import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single tutor. It only renders its child route — the read-only view
 * (`/tutors/$id/`) or the edit form (`/tutors/$id/edit`).
 */
export const Route = createFileRoute("/tutors/$id")({
  component: TutorIdLayout,
});

function TutorIdLayout() {
  return <Outlet />;
}
