import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired: the Book Exercises hub, Question Sheets, and Answer Sheets were three nav destinations
 * over the same data. They merged into the tabbed /exercises hub; this redirect keeps old links alive.
 */
export const Route = createFileRoute("/book-exercises/")({
  beforeLoad: () => {
    throw redirect({
      to: "/exercises",
    });
  },
});
