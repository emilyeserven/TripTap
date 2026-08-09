import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { CultureNoteForm } from "@/components/CultureNoteForm";
import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { useCultureNote, useDeleteCultureNote } from "@/hooks/useCultureNotes";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/culture/$id/edit")({
  component: EditCultureNotePage,
});

function EditCultureNotePage() {
  usePageTitle("Edit culture note");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteNote = useDeleteCultureNote();

  return (
    <EntityEditPage
      query={useCultureNote(id)}
      noun="Culture note"
      backLink={(
        <Link
          to="/culture/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to note
        </Link>
      )}
      deletePending={deleteNote.isPending}
      onDelete={() => {
        if (globalThis.confirm("Delete this culture note?")) {
          deleteNote.mutate(id, {
            onSuccess: () => navigate({
              to: "/culture",
            }),
          });
        }
      }}
    >
      {note => (
        <CultureNoteForm
          note={note}
          onSuccess={() =>
            navigate({
              to: "/culture/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
