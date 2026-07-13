import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single reading session. It only renders its child route — the read-only view
 * (`/reading-sessions/$id/`) or the edit form (`/reading-sessions/$id/edit`).
 */
export const Route = createFileRoute("/reading-sessions/$id")({
  component: ReadingSessionIdLayout,
});

function ReadingSessionIdLayout() {
  return <Outlet />;
}
