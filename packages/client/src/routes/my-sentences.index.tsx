import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — My Sentences is now the `mine` view of the unified Sentences page. */
export const Route = createFileRoute("/my-sentences/")({
  validateSearch: (search: Record<string, unknown>): { needsCorrection?: boolean } => (
    search.needsCorrection === true || search.needsCorrection === "true"
      ? {
        needsCorrection: true,
      }
      : {}
  ),
  beforeLoad: ({
    search,
  }) => {
    throw redirect({
      to: "/sentences",
      search: {
        view: "mine",
        ...(search.needsCorrection
          ? {
            needsCorrection: true,
          }
          : {}),
      },
    });
  },
});
