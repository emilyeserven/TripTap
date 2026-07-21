import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single theory session. It only renders its child route — the read-only view
 * (`/theory-sessions/$id/`) or the edit form (`/theory-sessions/$id/edit`).
 */
export const Route = createFileRoute("/theory-sessions/$id")({
  component: TheorySessionIdLayout,
});

function TheorySessionIdLayout() {
  return <Outlet />;
}
