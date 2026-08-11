import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — the breakdown import now lives under the unified Sentences pages. */
export const Route = createFileRoute("/practice/import")({
  beforeLoad: () => {
    throw redirect({
      to: "/sentences/import",
    });
  },
});
