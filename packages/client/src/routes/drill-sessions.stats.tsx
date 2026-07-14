import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DrillStats } from "@/components/DrillStats";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/drill-sessions/stats")({
  component: DrillStatsPage,
});

function DrillStatsPage() {
  usePageTitle("Drill Statistics");

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
      <DrillStats />
    </section>
  );
}
