import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — a My Sentence's page is now the unified sentence page (same id). */
export const Route = createFileRoute("/my-sentences/$id/")({
  beforeLoad: ({
    params,
  }) => {
    throw redirect({
      to: "/sentences/$id",
      params,
    });
  },
});
