import type { PracticeDraft, SetPracticeDraft } from "@/lib/practiceEditor";
import type { ReactNode } from "react";

import { Volume2 } from "lucide-react";

import { speak } from "./ai-lesson/speak";
import { PracticeField } from "./PracticeField";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Step — Analyze the Translation: E→J recall drill, natural translation, gloss, and nuance. */
export function PracticeAnalyzeTab({
  draft,
  set,
  originTranslation,
  recallRevealed,
  onReveal,
  footer,
}: {
  draft: PracticeDraft;
  set: SetPracticeDraft;
  /** The origin bank sentence's translation, for the one-click fill (null when unavailable). */
  originTranslation: string | null;
  /** Reveal state lives in the editor so it survives tab switches. */
  recallRevealed: boolean;
  onReveal: () => void;
  footer: ReactNode;
}) {
  return (
    <>
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label className="text-sm">Recall drill (E→J)</Label>
          <span className="text-xs text-muted-foreground/80">say the Japanese from the English</span>
        </div>
        {draft.translation
          ? <p className="text-sm">{draft.translation}</p>
          : (
            <p className="text-sm text-muted-foreground">
              Add a translation below, then use this to test recall.
            </p>
          )}
        {recallRevealed
          ? (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Hear it"
                onClick={() => speak(draft.text)}
              >
                <Volume2 className="size-4" />
              </Button>
              <p className="text-lg font-semibold">{draft.text}</p>
            </div>
          )
          : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!draft.translation}
              onClick={onReveal}
            >
              Reveal the Japanese
            </Button>
          )}
      </div>
      <PracticeField label="Natural translation">
        <Textarea
          value={draft.translation}
          onChange={e => set("translation", e.target.value)}
          placeholder="Can't even take a day off work — it's seriously a headache."
          rows={2}
        />
      </PracticeField>
      {originTranslation && !draft.translation
        ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("translation", originTranslation)}
          >
            Fill from bank sentence
          </Button>
        )
        : null}
      <PracticeField
        label="Literal / structural gloss"
        hint="optional — only when the structure surprised you"
      >
        <Input
          value={draft.literal}
          onChange={e => set("literal", e.target.value)}
          placeholder="part-time-job ALSO rest-can't AND, seriously head SUBJ hurts"
        />
      </PracticeField>
      <PracticeField
        label="Nuance"
        hint="who says this, to whom, and what would be wrong instead"
      >
        <Textarea
          value={draft.nuance}
          onChange={e => set("nuance", e.target.value)}
          placeholder="Friends only. マジで would be jarring at work — 本当に there instead."
          rows={2}
        />
      </PracticeField>
      {footer}
    </>
  );
}
