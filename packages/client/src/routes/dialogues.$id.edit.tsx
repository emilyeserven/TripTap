import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { DialogueForm } from "@/components/DialogueForm";
import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { useDeleteDialogue, useDialogue } from "@/hooks/useDialogues";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/dialogues/$id/edit")({
  component: EditDialoguePage,
});

function EditDialoguePage() {
  usePageTitle("Edit dialogue");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteDialogue();

  return (
    <EntityEditPage
      query={useDialogue(id)}
      noun="Dialogue"
      backLink={(
        <Link
          to="/dialogues/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to dialogue
        </Link>
      )}
      deletePending={remove.isPending}
      onDelete={() =>
        remove.mutate(id, {
          onSuccess: () => navigate({
            to: "/dialogues",
          }),
        })}
    >
      {entity => (
        <DialogueForm
          dialogue={entity}
          onSuccess={() =>
            navigate({
              to: "/dialogues/$id",
              params: {
                id,
              },
            })}
        />
      )}
    </EntityEditPage>
  );
}
