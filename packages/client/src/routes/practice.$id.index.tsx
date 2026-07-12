import { createFileRoute } from "@tanstack/react-router";

import { PracticeSentenceView } from "@/components/PracticeSentenceView";
import { usePracticeSentence } from "@/hooks/usePracticeSentences";
import { useSources } from "@/hooks/useSources";

export const Route = createFileRoute("/practice/$id/")({
  component: ViewPracticePage,
});

function ViewPracticePage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = usePracticeSentence(id);
  const {
    data: sources,
  } = useSources();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Practice sentence not found.</p>;

  const sourceName = data.sourceId
    ? sources?.find(s => s.id === data.sourceId)?.name ?? null
    : null;

  return (
    <PracticeSentenceView
      practiceSentence={data}
      sourceName={sourceName}
    />
  );
}
