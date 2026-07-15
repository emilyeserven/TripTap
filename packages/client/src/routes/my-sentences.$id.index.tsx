import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { MySentenceView } from "@/components/MySentenceView";
import { Button } from "@/components/ui/button";
import { useMySentence } from "@/hooks/useMySentences";

export const Route = createFileRoute("/my-sentences/$id/")({
  component: ViewMySentencePage,
});

function ViewMySentencePage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useMySentence(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Sentence not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/my-sentences">
            <ArrowLeft className="size-4" />
            All my sentences
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/my-sentences/$id/edit"
              params={{
                id,
              }}
            >
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <MySentenceView mySentence={data} />
    </section>
  );
}
