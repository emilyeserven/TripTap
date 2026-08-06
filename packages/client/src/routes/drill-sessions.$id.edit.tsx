import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { DrillSessionForm } from "@/components/DrillSessionForm";
import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { useDeleteDrillSession, useDrillSession } from "@/hooks/useDrillSessions";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/drill-sessions/$id/edit")({
  component: EditDrillSessionPage,
});

function EditDrillSessionPage() {
  usePageTitle("Edit drill session");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteDrillSession();

  return (
    <EntityEditPage
      query={useDrillSession(id)}
      noun="Drill session"
      backLink={(
        <Link
          to="/drill-sessions/$id"
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
            to: "/drill-sessions",
          }),
        })}
    >
      {entity => (
        <DrillSessionForm
          session={entity}
          onSuccess={() =>
            navigate({
              to: "/drill-sessions/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
