import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired: the Answer Sheets list merged into the tabbed /exercises hub (detail routes under
 * /answer-sheets/$id remain). This redirect keeps old links alive.
 */
export const Route = createFileRoute("/answer-sheets/")({
  beforeLoad: () => {
    throw redirect({
      to: "/exercises",
      search: {
        tab: "answers",
      },
    });
  },
});
