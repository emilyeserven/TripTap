import { createFileRoute, Link } from "@tanstack/react-router";

import { CultureNoteView } from "@/components/CultureNoteView";
import { BackIcon, EditIcon, EntityDetailPage } from "@/components/EntityPage";
import { useCultureNote } from "@/hooks/useCultureNotes";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/culture/$id/")({
  component: CultureNotePage,
});

function CultureNotePage() {
  usePageTitle("Culture note");
  const {
    id,
  } = Route.useParams();

  return (
    <EntityDetailPage
      query={useCultureNote(id)}
      noun="Culture note"
      backLink={(
        <Link to="/culture">
          <BackIcon className="size-4" />
          All culture notes
        </Link>
      )}
      editLink={(
        <Link
          to="/culture/$id/edit"
          params={{
            id,
          }}
        >
          <EditIcon className="size-4" />
          Edit
        </Link>
      )}
    >
      {note => <CultureNoteView note={note} />}
    </EntityDetailPage>
  );
}
