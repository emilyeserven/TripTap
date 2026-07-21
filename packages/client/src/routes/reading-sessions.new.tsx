import type { BookmarkSectionRef } from "@sentence-bank/types";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ReadingSessionForm } from "@/components/ReadingSessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Parse the JSON-encoded `section` search param (from Start Something) back into a section ref. */
function parseSectionParam(raw: unknown): BookmarkSectionRef | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      parsed
      && typeof parsed.id === "string"
      && typeof parsed.label === "string"
      && typeof parsed.type === "string"
    ) {
      return {
        id: parsed.id,
        label: parsed.label,
        type: parsed.type as BookmarkSectionRef["type"],
        startValue: typeof parsed.startValue === "string" ? parsed.startValue : null,
        endValue: typeof parsed.endValue === "string" ? parsed.endValue : null,
      };
    }
  }
  catch {
    // Malformed section param — ignore and start without a preselected section.
  }
  return undefined;
}

export const Route = createFileRoute("/reading-sessions/new")({
  validateSearch: (search: Record<string, unknown>): {
    title?: string;
    bookmarkId?: string;
    bookmarkTitle?: string;
    bookmarkUrl?: string;
    section?: BookmarkSectionRef;
  } => ({
    title: typeof search.title === "string" ? search.title : undefined,
    bookmarkId: typeof search.bookmarkId === "string" ? search.bookmarkId : undefined,
    bookmarkTitle: typeof search.bookmarkTitle === "string" ? search.bookmarkTitle : undefined,
    bookmarkUrl: typeof search.bookmarkUrl === "string" ? search.bookmarkUrl : undefined,
    section: parseSectionParam(search.section),
  }),
  component: NewReadingSessionPage,
});

function NewReadingSessionPage() {
  usePageTitle("New reading session");
  const navigate = useNavigate();
  const {
    title, bookmarkId, bookmarkTitle, bookmarkUrl, section,
  } = Route.useSearch();
  const initialBookmark = bookmarkId
    ? {
      id: bookmarkId,
      title: bookmarkTitle ?? "",
      url: bookmarkUrl ?? null,
    }
    : undefined;

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/reading-sessions">
          <ArrowLeft className="size-4" />
          All reading sessions
        </Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">
          Note where the reading came from, translate it freeform or line-by-line, and jot down the
          words you were shaky on or didn’t know.
        </p>
      </div>
      <ReadingSessionForm
        initialTitle={title}
        initialBookmark={initialBookmark}
        initialSection={section ?? null}
        onSuccess={id =>
          navigate({
            to: "/reading-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
