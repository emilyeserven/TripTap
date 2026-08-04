import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { DialogueCard } from "@/components/DialogueCard";
import { Button } from "@/components/ui/button";
import { useDialogues } from "@/hooks/useDialogues";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/dialogues/")({
  component: DialoguesIndexPage,
});

function DialoguesIndexPage() {
  usePageTitle("Dialogues");
  const {
    data, isLoading, error,
  } = useDialogues();

  return (
    <section className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            Multi-speaker scripts as a chat transcript. Hide a speaker to practise their half.
          </p>
        </div>
        <Button asChild>
          <Link to="/dialogues/new">
            <Plus className="size-4" />
            New dialogue
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && data.length === 0 && (
        <p className="text-muted-foreground">No dialogues yet. Create your first one.</p>
      )}
      {data && data.length > 0 && (
        <div
          className="
            grid gap-4
            sm:grid-cols-2
          "
        >
          {data.map(dialogue => (
            <DialogueCard
              key={dialogue.id}
              dialogue={dialogue}
            />
          ))}
        </div>
      )}
    </section>
  );
}
