import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { TheorySessionForm } from "@/components/TheorySessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/theory-sessions/new")({
  component: NewTheorySessionPage,
});

function NewTheorySessionPage() {
  usePageTitle("New theory session");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/theory-sessions">
          <ArrowLeft className="size-4" />
          All sessions
        </Link>
      </Button>
      <TheorySessionForm
        onSuccess={id =>
          navigate({
            to: "/theory-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
