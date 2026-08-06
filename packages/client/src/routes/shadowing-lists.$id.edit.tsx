import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { ShadowingListForm } from "@/components/ShadowingListForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteShadowingList, useShadowingList } from "@/hooks/useShadowingLists";

export const Route = createFileRoute("/shadowing-lists/$id/edit")({
  component: EditShadowingListPage,
});

function EditShadowingListPage() {
  usePageTitle("Edit shadowing list");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteShadowingList();

  return (
    <EntityEditPage
      query={useShadowingList(id)}
      noun="Shadowing list"
      backLink={(
        <Link
          to="/shadowing-lists/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to list
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/shadowing-lists",
          }),
        })}
    >
      {entity => (
        <ShadowingListForm
          list={entity}
          onSuccess={() =>
            navigate({
              to: "/shadowing-lists/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
