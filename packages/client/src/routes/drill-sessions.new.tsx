import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrillSessionForm } from "@/components/DrillSessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/drill-sessions/new")({
  component: NewDrillSessionPage,
  validateSearch: (search: Record<string, unknown>): {
    bookmarkId?: string;
    bookmarkTitle?: string;
    bookmarkUrl?: string;
  } => ({
    bookmarkId: typeof search.bookmarkId === "string" ? search.bookmarkId : undefined,
    bookmarkTitle: typeof search.bookmarkTitle === "string" ? search.bookmarkTitle : undefined,
    bookmarkUrl: typeof search.bookmarkUrl === "string" ? search.bookmarkUrl : undefined,
  }),
});

function NewDrillSessionPage() {
  usePageTitle("New drill session");
  const navigate = useNavigate();
  const {
    bookmarkId, bookmarkTitle, bookmarkUrl,
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
        <Link to="/drill-sessions">
          <ArrowLeft className="size-4" />
          All sessions
        </Link>
      </Button>
      <DrillSessionForm
        initialBookmark={initialBookmark}
        onSuccess={id =>
          navigate({
            to: "/drill-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
