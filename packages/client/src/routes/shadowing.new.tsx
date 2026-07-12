import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ShadowingSessionForm } from "@/components/ShadowingSessionForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/shadowing/new")({
  component: NewShadowingSessionPage,
});

function NewShadowingSessionPage() {
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/shadowing">
          <ArrowLeft className="size-4" />
          All sessions
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">New shadowing session</h1>
        <p className="text-sm text-muted-foreground">
          Set a video and define segments to loop. You can import segments from a bookmark’s sections.
        </p>
      </div>
      <ShadowingSessionForm
        onSuccess={id =>
          navigate({
            to: "/shadowing/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
