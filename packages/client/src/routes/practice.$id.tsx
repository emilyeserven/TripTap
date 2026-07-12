import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single practice sentence. It only renders its child route — the read-only view
 * (`/practice/$id/`) or the tabbed editor (`/practice/$id/edit`).
 */
export const Route = createFileRoute("/practice/$id")({
  component: PracticeIdLayout,
});

function PracticeIdLayout() {
  return <Outlet />;
}
