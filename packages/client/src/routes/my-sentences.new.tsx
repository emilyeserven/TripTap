import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — creating a My Sentence now lives on the unified new-sentence page. */
export const Route = createFileRoute("/my-sentences/new")({
  beforeLoad: () => {
    throw redirect({
      to: "/sentences/new",
      search: {
        kind: "mine",
      },
    });
  },
});
