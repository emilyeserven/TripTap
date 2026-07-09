import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { LessonPasteBox } from "@/components/LessonPasteBox";
import { LessonPromptGenerator } from "@/components/LessonPromptGenerator";

export const Route = createFileRoute("/lessons/new")({
  component: NewLessonPage,
});

function NewLessonPage() {
  return (
    <section className="space-y-6">
      <div>
        <Link
          to="/lessons"
          className="
            mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground
            hover:underline
          "
        >
          <ArrowLeft className="size-3.5" />
          Lessons
        </Link>
        <h1 className="text-2xl font-bold">New lesson</h1>
        <p className="text-sm text-muted-foreground">
          Generate a prompt, run it in Claude with the lesson skill, then paste the JSON to import.
        </p>
      </div>
      <LessonPromptGenerator />
      <LessonPasteBox />
    </section>
  );
}
