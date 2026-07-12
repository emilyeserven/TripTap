import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single listening session. It only renders its child route — the interactive view
 * (`/listening-sessions/$id/`) or the edit form (`/listening-sessions/$id/edit`).
 */
export const Route = createFileRoute("/listening-sessions/$id")({
  component: ListeningSessionIdLayout,
});

function ListeningSessionIdLayout() {
  return <Outlet />;
}
