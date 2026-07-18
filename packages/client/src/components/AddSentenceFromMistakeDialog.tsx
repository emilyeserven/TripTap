import type { DrillMistake } from "@sentence-bank/types";

import { useState } from "react";

import { Plus } from "lucide-react";

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

interface Prefill {
  text: string;
  translation: string | null;
  explanation: string | null;
  reasons: DrillMistake["reasons"];
  needsCorrection: boolean;
}

/** Seed the My Sentence form from a drill mistake: the correct usage + why it was wrong + its reasons. */
function prefillFromMistake(mistake: DrillMistake): Prefill {
  return {
    text: mistake.correctAnswer ?? mistake.prompt ?? "",
    translation: null,
    explanation: mistake.reflection ?? null,
    reasons: mistake.reasons,
    needsCorrection: false,
  };
}

/**
 * "Add sentence" action for a drill mistake: opens a dialog that pre-fills a My Sentence (text +
 * reasons + why-it-was-wrong) for the learner to write in their own words. Tatoeba example lookup
 * lives on the mistake card itself as a read-only reference — those sentences stay Tatoeba's.
 */
export function AddSentenceFromMistakeDialog({
  mistake,
}: { mistake: DrillMistake }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reset the form to the mistake's defaults each time the dialog opens.
        if (next) setFormKey(k => k + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
        >
          <Plus className="size-4" />
          Add sentence
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a sentence from this mistake</DialogTitle>
          <DialogDescription>
            Saves to My Sentences, carrying the reasons from this mistake. Write it in your own words.
          </DialogDescription>
        </DialogHeader>

        <MySentenceForm
          key={formKey}
          prefill={prefillFromMistake(mistake)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
