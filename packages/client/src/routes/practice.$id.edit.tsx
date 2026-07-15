import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PracticeSentenceEditor } from "@/components/PracticeSentenceEditor";
import { Button } from "@/components/ui/button";
import { useDeletePracticeSentence, usePracticeSentence } from "@/hooks/usePracticeSentences";

export const Route = createFileRoute("/practice/$id/edit")({
  component: EditPracticePage,
});

function EditPracticePage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deletePracticeSentence = useDeletePracticeSentence();
  const {
    data, isLoading, error,
  } = usePracticeSentence(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Practice sentence not found.</p>;

  const remove = () => {
    deletePracticeSentence.mutate(id, {
      onSuccess: () => navigate({
        to: "/practice",
      }),
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deletePracticeSentence.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <PracticeSentenceEditor practiceSentence={data} />
    </section>
  );
}
