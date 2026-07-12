import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single listening session. It only renders its child route — the interactive view
 * (`/listen-shadow/$id/`) or the edit form (`/listen-shadow/$id/edit`).
 */
export const Route = createFileRoute("/listen-shadow/$id")({
  component: ListeningSessionIdLayout,
});

function ListeningSessionIdLayout() {
  return <Outlet />;
}
