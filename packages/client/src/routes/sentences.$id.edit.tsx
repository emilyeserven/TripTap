import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { BackIcon, EntityEditPage } from "@/components/EntityPage";
import { MySentenceForm } from "@/components/MySentenceForm";
import { PracticeScreenshotEditor } from "@/components/PracticeScreenshotEditor";
import { PracticeSentenceEditor } from "@/components/PracticeSentenceEditor";
import { SentenceForm } from "@/components/SentenceForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteSentence, useSentence } from "@/hooks/useSentences";

export const Route = createFileRoute("/sentences/$id/edit")({
  component: EditSentencePage,
});

/** Edit surface for one sentence, branched on its kind (each kind keeps its own editor). */
function EditSentencePage() {
  usePageTitle("Edit sentence");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const remove = useDeleteSentence();
  const query = useSentence(id);
  const {
    data, isLoading, error,
  } = query;

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Sentence not found.</p>;

  // Practice edits in the guided, autosaving worksheet — no save button, delete up top.
  if (data.kind === "practice") {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id, {
              onSuccess: () => void navigate({
                to: "/sentences",
                search: {
                  view: "practice",
                },
              }),
            })}
          >
            Delete
          </Button>
        </div>
        <PracticeSentenceEditor practiceSentence={data} />
        <PracticeScreenshotEditor practiceSentence={data} />
      </section>
    );
  }

  if (data.kind === "mine") {
    return (
      <EntityEditPage
        query={query}
        noun="Sentence"
        backLink={(
          <Link
            to="/sentences/$id"
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
            onSuccess: () => void navigate({
              to: "/sentences",
              search: {
                view: "mine",
              },
            }),
          })}
      >
        {entity => (
          <MySentenceForm
            mySentence={entity}
            onSuccess={() =>
              void navigate({
                to: "/sentences/$id",
                params: {
                  id,
                },
              })}
          />
        )}
      </EntityEditPage>
    );
  }

  // Bank: the form carries its own Delete and furigana editor in edit mode.
  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link
          to="/sentences/$id"
          params={{
            id,
          }}
        >
          <BackIcon className="size-4" />
          Back to sentence
        </Link>
      </Button>
      <SentenceForm
        sentence={data}
        onSuccess={() =>
          void navigate({
            to: "/sentences/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
