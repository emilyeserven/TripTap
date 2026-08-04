import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DialogueForm } from "@/components/DialogueForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/dialogues/new")({
  component: NewDialoguePage,
});

function NewDialoguePage() {
  usePageTitle("New dialogue");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/dialogues">
          <ArrowLeft className="size-4" />
          All dialogues
        </Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">
          Paste a script and it becomes a chat transcript, with you on the right.
        </p>
      </div>
      <DialogueForm
        onSuccess={id =>
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
