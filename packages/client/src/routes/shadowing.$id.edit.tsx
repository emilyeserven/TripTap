import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { ShadowingSessionForm } from "@/components/ShadowingSessionForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteShadowingSession, useShadowingSession } from "@/hooks/useShadowingSessions";

export const Route = createFileRoute("/shadowing/$id/edit")({
  component: EditShadowingSessionPage,
});

function EditShadowingSessionPage() {
  usePageTitle("Edit session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteShadowingSession();

  return (
    <EntityEditPage
      query={useShadowingSession(id)}
      noun="Session"
      backLink={(
        <Link
          to="/shadowing/$id"
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
            to: "/shadowing",
          }),
        })}
    >
      {entity => (
        <ShadowingSessionForm
          session={entity}
          onSuccess={() =>
            navigate({
              to: "/shadowing/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
