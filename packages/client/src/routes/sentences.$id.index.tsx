import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { MySentenceView } from "@/components/MySentenceView";
import { PracticeSentenceView } from "@/components/PracticeSentenceView";
import { SentenceCard } from "@/components/SentenceCard";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSentence } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";

export const Route = createFileRoute("/sentences/$id/")({
  component: ViewSentencePage,
});

/** Read-only view of one sentence, branched on its kind. */
function ViewSentencePage() {
  usePageTitle("Sentence");
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useSentence(id);
  const {
    data: sources,
  } = useSources();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Sentence not found.</p>;

  const sourceName = data.sourceId
    ? sources?.find(s => s.id === data.sourceId)?.name ?? null
    : null;

  // Practice's view carries its own header (back link, edit button, pass toggles).
  if (data.kind === "practice") {
    return (
      <PracticeSentenceView
        practiceSentence={data}
        sourceName={sourceName}
      />
    );
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/sentences"
            search={{
              view: data.kind,
            }}
          >
            <ArrowLeft className="size-4" />
            {data.kind === "mine" ? "All my sentences" : "All sentences"}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link
            to="/sentences/$id/edit"
            params={{
              id,
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      {data.kind === "mine"
        ? <MySentenceView mySentence={data} />
        : (
          <FuriganaScope>
            <SentenceCard
              sentence={data}
              sourceName={sourceName}
            />
          </FuriganaScope>
        )}
    </section>
  );
}
