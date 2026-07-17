import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { GrammarNoteView } from "@/components/GrammarNoteView";
import { Button } from "@/components/ui/button";
import { useGrammarNote } from "@/hooks/useGrammarNotes";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/grammar-notes/$id/")({
  component: ViewGrammarNotePage,
});

function ViewGrammarNotePage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useGrammarNote(id);
  usePageTitle(data ? data.title : "");

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Grammar note not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/grammar-notes">
            <ArrowLeft className="size-4" />
            All grammar notes
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link
            to="/grammar-notes/$id/edit"
            params={{
              id,
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <GrammarNoteView note={data} />
    </section>
  );
}
