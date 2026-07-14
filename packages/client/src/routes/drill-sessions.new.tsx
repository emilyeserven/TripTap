import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrillSessionForm } from "@/components/DrillSessionForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/drill-sessions/new")({
  component: NewDrillSessionPage,
});

function NewDrillSessionPage() {
  usePageTitle("New drill session");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/drill-sessions">
          <ArrowLeft className="size-4" />
          All sessions
        </Link>
      </Button>
      <DrillSessionForm
        onSuccess={id =>
          navigate({
            to: "/drill-sessions/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
