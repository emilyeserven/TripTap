import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired: the cross-AI-lesson grammar rollup was a strict subset of GrammarNoteView except for its
 * tagging on-ramp, which moved to /grammar-notes as the "Untagged from AI lessons" inbox. This
 * redirect keeps old links alive; tagged AI-lesson items surface on their note's page.
 */
export const Route = createFileRoute("/grammar")({
  beforeLoad: () => {
    throw redirect({
      to: "/grammar-notes",
    });
  },
});
