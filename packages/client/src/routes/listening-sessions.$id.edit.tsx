import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { ListeningSessionForm } from "@/components/ListeningSessionForm";
import { useDeleteListeningSession, useListeningSession } from "@/hooks/useListeningSessions";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/listening-sessions/$id/edit")({
  component: EditListeningSessionPage,
});

function EditListeningSessionPage() {
  usePageTitle("Edit session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteListeningSession();

  return (
    <EntityEditPage
      query={useListeningSession(id)}
      noun="Session"
      backLink={(
        <Link
          to="/listening-sessions/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to session
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/listening-sessions",
          }),
        })}
    >
      {entity => (
        <ListeningSessionForm
          session={entity}
          onSuccess={() =>
            navigate({
              to: "/listening-sessions/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
