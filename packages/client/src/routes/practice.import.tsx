import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PracticeBreakdownImport } from "@/components/PracticeBreakdownImport";
import { PracticeBreakdownPromptGenerator } from "@/components/PracticeBreakdownPromptGenerator";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/practice/import")({
  component: PracticeImportPage,
});

function PracticeImportPage() {
  usePageTitle("Import a breakdown");

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/practice">
          <ArrowLeft className="size-4" />
          Study Sentences
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        Have an AI break a sentence down, then paste the JSON here to make a study card. Generate a
        prompt, run it in Claude with the breakdown skill (installable from Settings), and paste what
        it returns. You can attach the screenshot you used for context.
      </p>
      <PracticeBreakdownPromptGenerator />
      <PracticeBreakdownImport />
    </section>
  );
}
