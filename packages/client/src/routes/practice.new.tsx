import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — starting a practice sentence now lives on the unified new-sentence page. */
export const Route = createFileRoute("/practice/new")({
  beforeLoad: () => {
    throw redirect({
      to: "/sentences/new",
      search: {
        kind: "practice",
      },
    });
  },
});
