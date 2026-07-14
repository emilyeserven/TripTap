import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrillReasonsManager } from "@/components/DrillReasonsManager";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/drill-sessions/reasons")({
  component: DrillReasonsPage,
});

function DrillReasonsPage() {
  usePageTitle("Mistake Reasons");

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
      <DrillReasonsManager />
    </section>
  );
}
