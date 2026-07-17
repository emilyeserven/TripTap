import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single grammar note. It only renders its child route — the read-only view
 * (`/grammar-notes/$id/`) or the edit form (`/grammar-notes/$id/edit`).
 */
export const Route = createFileRoute("/grammar-notes/$id")({
  component: GrammarNoteIdLayout,
});

function GrammarNoteIdLayout() {
  return <Outlet />;
}
