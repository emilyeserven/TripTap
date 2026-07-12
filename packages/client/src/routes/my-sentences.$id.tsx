import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single my-sentence. It only renders its child route — the read-only view
 * (`/my-sentences/$id/`) or the edit form (`/my-sentences/$id/edit`).
 */
export const Route = createFileRoute("/my-sentences/$id")({
  component: MySentenceIdLayout,
});

function MySentenceIdLayout() {
  return <Outlet />;
}
