import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single dialogue. It only renders its child route — the transcript view
 * (`/dialogues/$id/`) or the edit form (`/dialogues/$id/edit`).
 */
export const Route = createFileRoute("/dialogues/$id")({
  component: Outlet,
});
