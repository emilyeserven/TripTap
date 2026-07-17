import type { PickedExample } from "@/components/TatoebaExamplePicker";
import type { DrillMistake } from "@sentence-bank/types";

import { useState } from "react";

import { Plus } from "lucide-react";

import { MySentenceForm } from "@/components/MySentenceForm";
import { TatoebaExamplePicker } from "@/components/TatoebaExamplePicker";
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
 * reasons + why-it-was-wrong) and offers Tatoeba example lookup to seed the sentence from a real
 * example. Picking an example re-seeds the form (bumping `formKey`).
 */
export function AddSentenceFromMistakeDialog({
  mistake,
}: { mistake: DrillMistake }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill>(() => prefillFromMistake(mistake));
  const [formKey, setFormKey] = useState(0);

  const baseExplanation = mistake.reflection ?? "";
  const defaultQuery = mistake.correctAnswer ?? mistake.prompt ?? mistake.question ?? "";

  const handleUse = (example: PickedExample) => {
    const attribution = `From Tatoeba #${example.id}`;
    setPrefill(prev => ({
      ...prev,
      text: example.text,
      translation: example.translation,
      explanation: baseExplanation ? `${baseExplanation}\n\n${attribution}` : attribution,
    }));
    setFormKey(k => k + 1);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reset to the mistake's defaults each time the dialog opens.
        if (next) {
          setPrefill(prefillFromMistake(mistake));
          setFormKey(k => k + 1);
        }
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
            Saves to My Sentences, carrying the reasons from this mistake. Find a real example on
            Tatoeba, or write your own.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TatoebaExamplePicker
            defaultQuery={defaultQuery}
            onUse={handleUse}
          />
          <MySentenceForm
            key={formKey}
            prefill={prefill}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
