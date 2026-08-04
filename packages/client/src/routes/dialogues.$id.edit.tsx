import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DialogueForm } from "@/components/DialogueForm";
import { Button } from "@/components/ui/button";
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
  const deleteDialogue = useDeleteDialogue();
  const {
    data, isLoading, error,
  } = useDialogue(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Dialogue not found.</p>;

  const remove = () => {
    deleteDialogue.mutate(id, {
      onSuccess: () => navigate({
        to: "/dialogues",
      }),
    });
  };

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/dialogues/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Back to dialogue
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteDialogue.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <DialogueForm
        dialogue={data}
        onSuccess={() =>
          navigate({
            to: "/dialogues/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
