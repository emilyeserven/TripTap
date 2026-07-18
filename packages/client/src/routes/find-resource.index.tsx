import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The video-only "Find a Resource" browser has been generalized into `/collections`, which surfaces
 * every item in the Collections source (not just ones with a runtime). This route redirects legacy
 * `/find-resource` links there.
 */
export const Route = createFileRoute("/find-resource/")({
  beforeLoad: () => {
    throw redirect({
      to: "/collections",
    });
  },
});
