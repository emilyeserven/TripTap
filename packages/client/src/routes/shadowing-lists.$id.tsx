import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single shadowing list. It only renders its child route — the view
 * (`/shadowing-lists/$id/`) or the edit form (`/shadowing-lists/$id/edit`).
 */
export const Route = createFileRoute("/shadowing-lists/$id")({
  component: ShadowingListIdLayout,
});

function ShadowingListIdLayout() {
  return <Outlet />;
}
