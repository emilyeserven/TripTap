import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — editing a practice sentence now lives on the unified sentence edit page. */
export const Route = createFileRoute("/practice/$id/edit")({
  beforeLoad: ({
    params,
  }) => {
    throw redirect({
      to: "/sentences/$id/edit",
      params,
    });
  },
});
