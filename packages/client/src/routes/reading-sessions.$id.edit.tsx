import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { ReadingSessionForm } from "@/components/ReadingSessionForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteReadingSession, useReadingSession } from "@/hooks/useReadingSessions";

export const Route = createFileRoute("/reading-sessions/$id/edit")({
  component: EditReadingSessionPage,
});

function EditReadingSessionPage() {
  usePageTitle("Edit reading session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteReadingSession();

  return (
    <EntityEditPage
      query={useReadingSession(id)}
      noun="Reading session"
      backLink={(
        <Link
          to="/reading-sessions/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to reading session
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/reading-sessions",
          }),
        })}
    >
      {entity => (
        <ReadingSessionForm
          session={entity}
          onSuccess={() =>
            navigate({
              to: "/reading-sessions/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
