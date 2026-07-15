import { useState } from "react";

import { Plus, X } from "lucide-react";

import { MySentenceCard } from "@/components/MySentenceCard";
import { MySentenceForm } from "@/components/MySentenceForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMySentencesForLesson } from "@/hooks/useMySentences";

/**
 * The "My Sentences" section for a lesson: lists the sentences added from this lesson and (unless
 * `readOnly`) offers an inline `MySentenceForm` to add another — linked to the lesson, language
 * prefilled. Reuses `MySentenceCard` so the corrected-first display comes for free.
 */
export function LessonMySentences({
  lessonId,
  language,
  readOnly = false,
}: {
  lessonId: string;
  language: string;
  readOnly?: boolean;
}) {
  const {
    data: sentences, isLoading,
  } = useMySentencesForLesson(lessonId);
  const [adding, setAdding] = useState(false);

  const shown = sentences ?? [];
  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>My Sentences</Label>
        {!readOnly && !adding
          ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAdding(true)}
            >
              <Plus className="size-4" />
              Add My Sentence
            </Button>
          )
          : null}
      </div>

      {adding && !readOnly
        ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">New My Sentence</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
                aria-label="Cancel"
              >
                <X className="size-4" />
              </Button>
            </div>
            <MySentenceForm
              lessonId={lessonId}
              defaultLanguage={language}
              onSuccess={() => setAdding(false)}
            />
          </div>
        )
        : null}

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-sm text-muted-foreground">
            {readOnly
              ? "No sentences from this lesson yet."
              : "No sentences from this lesson yet. Add one with “Add My Sentence”."}
          </p>
        )
        : null}

      <div className="space-y-3">
        {shown.map(ms => (
          <MySentenceCard
            key={ms.id}
            mySentence={ms}
          />
        ))}
      </div>
    </section>
  );
}
