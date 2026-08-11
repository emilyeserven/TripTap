import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — a practice sentence's page is now the unified sentence page (same id). */
export const Route = createFileRoute("/practice/$id/")({
  beforeLoad: ({
    params,
  }) => {
    throw redirect({
      to: "/sentences/$id",
      params,
    });
  },
});
