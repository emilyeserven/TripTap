import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — editing a My Sentence now lives on the unified sentence edit page. */
export const Route = createFileRoute("/my-sentences/$id/edit")({
  beforeLoad: ({
    params,
  }) => {
    throw redirect({
      to: "/sentences/$id/edit",
      params,
    });
  },
});
