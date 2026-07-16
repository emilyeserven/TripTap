import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ListeningSessionForm } from "@/components/ListeningSessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/listening-sessions/new")({
  component: NewListeningSessionPage,
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

function NewListeningSessionPage() {
  usePageTitle("New listening session");
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
        <Link to="/listening-sessions">
          <ArrowLeft className="size-4" />
          All sessions
        </Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">
          Pick a bookmark or paste a YouTube link, then open the session to start taking notes.
        </p>
      </div>
      <ListeningSessionForm
        initialBookmark={initialBookmark}
        onSuccess={id =>
          navigate({
            to: "/listening-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
