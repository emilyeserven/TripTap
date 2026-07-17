import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { GrammarNoteForm } from "@/components/GrammarNoteForm";
import { Button } from "@/components/ui/button";
import { useDeleteGrammarNote, useGrammarNote } from "@/hooks/useGrammarNotes";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/grammar-notes/$id/edit")({
  component: EditGrammarNotePage,
});

function EditGrammarNotePage() {
  usePageTitle("Edit grammar note");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteNote = useDeleteGrammarNote();
  const {
    data, isLoading, error,
  } = useGrammarNote(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Grammar note not found.</p>;

  const remove = () => {
    deleteNote.mutate(id, {
      onSuccess: () => navigate({
        to: "/grammar-notes",
      }),
    });
  };

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/grammar-notes/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Back to note
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteNote.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <GrammarNoteForm
        note={data}
        onSuccess={() =>
          navigate({
            to: "/grammar-notes/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
