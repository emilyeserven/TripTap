import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PracticeSentenceStart } from "@/components/PracticeSentenceStart";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/practice/new")({
  component: NewPracticePage,
});

function NewPracticePage() {
  usePageTitle("New practice sentence");
  return (
    <section className="space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/practice">
          <ArrowLeft className="size-4" />
          All practice sentences
        </Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">
          Type a sentence, or pull one from your bank. It saves as soon as you start — everything
          after that autosaves.
        </p>
      </div>
      <PracticeSentenceStart />
    </section>
  );
}
