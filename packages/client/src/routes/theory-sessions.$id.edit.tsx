import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { TheorySessionForm } from "@/components/TheorySessionForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteTheorySession, useTheorySession } from "@/hooks/useTheorySessions";

export const Route = createFileRoute("/theory-sessions/$id/edit")({
  component: EditTheorySessionPage,
});

function EditTheorySessionPage() {
  usePageTitle("Edit theory session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteTheorySession();

  return (
    <EntityEditPage
      query={useTheorySession(id)}
      noun="Theory session"
      backLink={(
        <Link
          to="/theory-sessions/$id"
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
            to: "/theory-sessions",
          }),
        })}
    >
      {entity => (
        <TheorySessionForm
          session={entity}
          onSuccess={() =>
            navigate({
              to: "/theory-sessions/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
