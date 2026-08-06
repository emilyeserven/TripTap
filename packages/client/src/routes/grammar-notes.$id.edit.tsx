import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { GrammarNoteForm } from "@/components/GrammarNoteForm";
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
  const remove = useDeleteGrammarNote();

  return (
    <EntityEditPage
      query={useGrammarNote(id)}
      noun="Grammar note"
      backLink={(
        <Link
          to="/grammar-notes/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to note
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/grammar-notes",
          }),
        })}
    >
      {entity => (
        <GrammarNoteForm
          note={entity}
          onSuccess={() =>
            navigate({
              to: "/grammar-notes/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
