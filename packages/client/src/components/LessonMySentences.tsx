import { useState } from "react";

import { Plus } from "lucide-react";

import { MySentenceCard } from "@/components/MySentenceCard";
import { MySentenceForm } from "@/components/MySentenceForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMySentencesForLesson } from "@/hooks/useMySentences";

/**
 * The "My Sentences" section on a lesson page: lists the sentences added from this lesson and offers a
 * dialog to add another (linked to the lesson, language prefilled). Reuses {@link MySentenceForm} and
 * {@link MySentenceCard} so the corrected-first display and full field set come for free.
 */
export function LessonMySentences({
  lessonId,
  language,
}: {
  lessonId: string;
  language: string;
}) {
  const {
    data: sentences, isLoading,
  } = useMySentencesForLesson(lessonId);
  const [open, setOpen] = useState(false);

  const shown = sentences ?? [];
  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>My Sentences</Label>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
            >
              <Plus className="size-4" />
              Add My Sentence
            </Button>
          </DialogTrigger>
          <DialogContent
            className="
              max-h-[85vh] overflow-y-auto
              sm:max-w-3xl
            "
          >
            <DialogHeader>
              <DialogTitle>Add a My Sentence</DialogTitle>
              <DialogDescription>
                A sentence you produced in this lesson. It’ll be linked to the lesson and appear in your
                My Sentences.
              </DialogDescription>
            </DialogHeader>
            <MySentenceForm
              lessonId={lessonId}
              defaultLanguage={language}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-sm text-muted-foreground">
            No sentences from this lesson yet. Add one with “Add My Sentence”.
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
