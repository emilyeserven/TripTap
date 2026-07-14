import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AiLessonPasteBox } from "@/components/AiLessonPasteBox";
import { AiLessonPromptGenerator } from "@/components/AiLessonPromptGenerator";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/ai-lessons/new")({
  component: NewAiLessonPage,
});

function NewAiLessonPage() {
  usePageTitle("New AI Lesson");
  return (
    <section className="space-y-6">
      <div>
        <Link
          to="/ai-lessons"
          className="
            mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground
            hover:underline
          "
        >
          <ArrowLeft className="size-3.5" />
          AI Lessons
        </Link>
        <p className="text-sm text-muted-foreground">
          Generate a prompt, run it in Claude with the AI Lesson skill, then paste the JSON to import.
        </p>
      </div>
      <AiLessonPromptGenerator />
      <AiLessonPasteBox />
    </section>
  );
}
