import { createFileRoute } from "@tanstack/react-router";

import { PracticeSentenceEditor } from "@/components/PracticeSentenceEditor";
import { usePracticeSentence } from "@/hooks/usePracticeSentences";

export const Route = createFileRoute("/practice/$id/edit")({
  component: EditPracticePage,
});

function EditPracticePage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = usePracticeSentence(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Practice sentence not found.</p>;

  return <PracticeSentenceEditor practiceSentence={data} />;
}
