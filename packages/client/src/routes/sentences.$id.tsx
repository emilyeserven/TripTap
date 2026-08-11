import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for a single sentence (any kind). It only renders its child route — the read-only view
 * (`/sentences/$id/`) or the edit surface (`/sentences/$id/edit`); both branch on the row's kind.
 */
export const Route = createFileRoute("/sentences/$id")({
  component: Outlet,
});
