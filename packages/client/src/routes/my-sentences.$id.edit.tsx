import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { MySentenceForm } from "@/components/MySentenceForm";
import { Button } from "@/components/ui/button";
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
  const deleteMySentence = useDeleteMySentence();
  const {
    data, isLoading, error,
  } = useMySentence(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Sentence not found.</p>;

  const remove = () => {
    deleteMySentence.mutate(id, {
      onSuccess: () => navigate({
        to: "/my-sentences",
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
            to="/my-sentences/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Back to sentence
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteMySentence.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">
          Update the correction, meanings, explanation, or tags.
        </p>
      </div>
      <MySentenceForm
        mySentence={data}
        onSuccess={() =>
          navigate({
            to: "/my-sentences/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
