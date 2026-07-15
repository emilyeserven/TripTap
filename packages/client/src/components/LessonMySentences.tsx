import { useState } from "react";

import { Plus, X } from "lucide-react";

import { CollapsibleSection } from "@/components/CollapsibleSection";
import { MySentenceCard } from "@/components/MySentenceCard";
import { MySentenceForm } from "@/components/MySentenceForm";
import { Button } from "@/components/ui/button";
import { useMySentencesForLesson } from "@/hooks/useMySentences";

/**
 * The "My Sentences" section for a lesson: lists the sentences added from this lesson and (unless
 * `readOnly`) lets the learner add, edit, and delete them **inline** — the whole flow stays on the
 * lesson page, no navigation. The `MySentenceForm` renders `embedded` (a plain `<div>`, not a nested
 * `<form>`) so the lesson's own form doesn't submit and reload the page on save. Reuses
 * `MySentenceCard` so the corrected-first display comes for free.
 */
export function LessonMySentences({
  lessonId,
  language,
  readOnly = false,
  bare = false,
}: {
  lessonId: string;
  language: string;
  readOnly?: boolean;
  /** Render just the content, without the `CollapsibleSection` wrapper (the caller supplies the section
   * container — e.g. the lesson view's cards/tabs layout). Intended for read-only embedding. */
  bare?: boolean;
}) {
  const {
    data: sentences, isLoading,
  } = useMySentencesForLesson(lessonId);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const shown = sentences ?? [];
  const nothing = !isLoading && shown.length === 0;

  const content = (
    <>
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
              embedded
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
        {shown.map(ms =>
          editingId === ms.id && !readOnly
            ? (
              <div
                key={ms.id}
                className="space-y-3 rounded-md border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Edit sentence</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <MySentenceForm
                  embedded
                  mySentence={ms}
                  onSuccess={() => setEditingId(null)}
                />
              </div>
            )
            : (
              <MySentenceCard
                key={ms.id}
                mySentence={ms}
                onEdit={readOnly ? undefined : setEditingId}
              />
            ))}
      </div>
    </>
  );

  if (bare) return content;

  return (
    <CollapsibleSection
      title="My Sentences"
      action={!readOnly && !adding
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
        : undefined}
    >
      {content}
    </CollapsibleSection>
  );
}
