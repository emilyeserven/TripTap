import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CultureTopicsManager } from "@/components/CultureTopicsManager";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/culture/topics")({
  component: CultureTopicsPage,
});

function CultureTopicsPage() {
  usePageTitle("Culture Topics");

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/culture">
          <ArrowLeft className="size-4" />
          All culture notes
        </Link>
      </Button>
      <CultureTopicsManager />
    </section>
  );
}
