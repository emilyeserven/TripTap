import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { MySentenceForm } from "@/components/MySentenceForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-sentences/new")({
  component: NewMySentencePage,
});

function NewMySentencePage() {
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
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
      <div>
        <h1 className="text-2xl font-bold">New sentence</h1>
        <p className="text-sm text-muted-foreground">
          Log a sentence you wrote — its intended meaning, what it actually says, and (optionally) a
          correction with an explanation.
        </p>
      </div>
      <MySentenceForm
        onSuccess={id =>
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
