import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single shadowing session. It only renders its child route — the interactive view
 * (`/shadowing/$id/`) or the edit form (`/shadowing/$id/edit`).
 */
export const Route = createFileRoute("/shadowing/$id")({
  component: ShadowingSessionIdLayout,
});

function ShadowingSessionIdLayout() {
  return <Outlet />;
}
