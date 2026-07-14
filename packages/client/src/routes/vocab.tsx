import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The standalone vocab bank now lives on the combined `/vocabulary` page (alongside AI-Lesson-mined
 * vocab), mirroring how `/sentences` unifies both sources. This route redirects legacy `/vocab`
 * links there.
 */
export const Route = createFileRoute("/vocab")({
  beforeLoad: () => {
    throw redirect({
      to: "/vocabulary",
    });
  },
});
