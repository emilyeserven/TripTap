import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single drill session. It only renders its child route — the read-only view
 * (`/drill-sessions/$id/`) or the edit form (`/drill-sessions/$id/edit`).
 */
export const Route = createFileRoute("/drill-sessions/$id")({
  component: DrillSessionIdLayout,
});

function DrillSessionIdLayout() {
  return <Outlet />;
}
