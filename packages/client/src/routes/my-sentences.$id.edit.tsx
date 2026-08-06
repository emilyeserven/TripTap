import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { MySentenceForm } from "@/components/MySentenceForm";
import { useDeleteMySentence, useMySentence } from "@/hooks/useMySentences";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/my-sentences/$id/edit")({
  component: EditMySentencePage,
});

function EditMySentencePage() {
  usePageTitle("Edit sentence");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteMySentence();

  return (
    <EntityEditPage
      query={useMySentence(id)}
      noun="Sentence"
      backLink={(
        <Link
          to="/my-sentences/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to sentence
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/my-sentences",
          }),
        })}
    >
      {entity => (
        <MySentenceForm
          mySentence={entity}
          onSuccess={() =>
            navigate({
              to: "/my-sentences/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
