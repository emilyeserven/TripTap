import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WritingEditor } from "@/components/WritingEditor";
import { useDeleteWriting, useWriting } from "@/hooks/useWritings";

export const Route = createFileRoute("/my-writing/$id")({
  component: WritingEntryPage,
});

function WritingEntryPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useWriting(id);
  const deleteWriting = useDeleteWriting();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/my-writing">
          <ArrowLeft className="size-4" />
          All my writing
        </Link>
      </Button>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!isLoading && !error && !data ? <p className="text-muted-foreground">Writing not found.</p> : null}

      {data
        ? (
          <WritingEditor
            writing={data}
            onDelete={writingId =>
              deleteWriting.mutate(writingId, {
                onSuccess: () =>
                  navigate({
                    to: "/my-writing",
                  }),
              })}
          />
        )
        : null}
    </section>
  );
}
