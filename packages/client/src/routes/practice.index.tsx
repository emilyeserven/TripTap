import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — Study (practice) Sentences is now a view of the unified Sentences page. */
export const Route = createFileRoute("/practice/")({
  beforeLoad: () => {
    throw redirect({
      to: "/sentences",
      search: {
        view: "practice",
      },
    });
  },
});
