import type { WordNote } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Check, PenLine } from "lucide-react";

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

/**
 * "Make a sentence" action for a reading-session word note: opens a dialog showing the word as the
 * target, then lets the learner write their own practice sentence (a My Sentence) using it. On save it
 * calls `onLinked` with the new sentence's id so the caller can record the word-note → sentence link —
 * which is what makes the word note earn its Reading XP. Once linked, the trigger shows a checkmark and
 * links through to the sentence.
 */
export function AddSentenceFromWordNoteDialog({
  note,
  language,
  onLinked,
}: {
  note: WordNote;
  /** The reading session's language, seeded into the new sentence. */
  language: string;
  /** Record the new My Sentence's id onto the word note (persist the link). */
  onLinked: (mySentenceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const hasWord = note.word.trim().length > 0;

  return (
    <div className="flex items-center gap-2">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setFormKey(k => k + 1);
        }}
      >
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasWord}
          >
            <PenLine className="size-4" />
            {note.mySentenceId ? "Make another" : "Make a sentence"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Make a sentence from this word</DialogTitle>
            <DialogDescription>
              Write your own sentence using the word. Saves to My Sentences and banks the word.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <span className="text-base font-medium">{note.word}</span>
            {note.reading ? <span className="ml-2 text-muted-foreground">{note.reading}</span> : null}
            {note.meaning ? <span className="ml-2 text-muted-foreground">— {note.meaning}</span> : null}
          </div>

          <MySentenceForm
            key={formKey}
            defaultLanguage={language}
            prefill={{
              needsCorrection: true,
            }}
            embedded
            onSuccess={(id) => {
              onLinked(id);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {note.mySentenceId
        ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <Link
              to="/my-sentences/$id"
              params={{
                id: note.mySentenceId,
              }}
            >
              <Check className="size-4 text-primary" />
              Sentence made
            </Link>
          </Button>
        )
        : null}
    </div>
  );
}
