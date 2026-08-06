import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired: the Question Sheets list merged into the tabbed /exercises hub (detail routes under
 * /question-sheets/$id remain). This redirect keeps old links alive.
 */
export const Route = createFileRoute("/question-sheets/")({
  beforeLoad: () => {
    throw redirect({
      to: "/exercises",
      search: {
        tab: "questions",
      },
    });
  },
});
