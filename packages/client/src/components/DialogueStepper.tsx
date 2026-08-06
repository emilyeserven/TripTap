import type { DialogueLine } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { isSelfSpeaker } from "@sentence-bank/types";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { speak } from "@/components/ai-lesson/speak";
import { DialogueLineBubble } from "@/components/DialogueLineBubble";
import { Button } from "@/components/ui/button";
import { ChatMessageList } from "@/components/ui/chat-bubble";
import { useHiddenDialogueLines } from "@/hooks/useHiddenDialogueLines";
import { cn } from "@/lib/utils";

/**
 * Steps through a dialogue one line at a time: the prior line stays visible but faded, the current
 * line is full-strength, and the learner advances at their own pace. That pacing is the practice —
 * each turn arrives alone, so the learner responds to it before seeing what comes next.
 *
 * `hiddenSpeakers` carries over from the whole-dialogue view: a hidden speaker's turn arrives as a
 * click-to-reveal placeholder, so the learner produces the line themselves before checking it. With
 * `autoRead` on, a line spoken by anyone who isn't the learner is read aloud when it appears, which
 * turns the stepper into a one-sided conversation partner: the app says the other side's turn, the
 * learner says theirs. Narration lines (no speaker) are never read.
 */
export function DialogueStepper({
  lines,
  selfSpeakers,
  hiddenSpeakers = [],
  autoRead = false,
  showTranslations = false,
}: {
  lines: DialogueLine[];
  selfSpeakers?: string[] | null;
  /** Speaker labels whose lines arrive hidden, until individually revealed. */
  hiddenSpeakers?: string[];
  /** When on, non-self lines are spoken via the Web Speech API as they become current. */
  autoRead?: boolean;
  /** When off, translations stay behind the app's standard blur-to-reveal. */
  showTranslations?: boolean;
}) {
  const [index, setIndex] = useState(0);
  // Which way the learner is travelling, so the bubbles can move with them rather than just swap.
  const [direction, setDirection] = useState<"back" | "forward">("forward");
  const {
    isHidden, reveal,
  } = useHiddenDialogueLines(hiddenSpeakers);

  const clamped = Math.min(index, Math.max(0, lines.length - 1));
  const current = lines.length > 0 ? lines[clamped] : undefined;
  const prior = clamped > 0 ? lines[clamped - 1] : null;
  const atEnd = clamped >= lines.length - 1;

  const go = (next: number, towards: "back" | "forward") => {
    setDirection(towards);
    setIndex(next);
  };

  // A primitive dep (the text, or null when nothing should be read) keeps the effect from re-firing
  // on unrelated rerenders — line objects change identity whenever the parent re-renders. Reading a
  // still-hidden line aloud would hand the learner the answer, so it waits for the reveal.
  const readText
    = autoRead && current !== undefined && current.speaker !== null
      && !isSelfSpeaker(current.speaker, selfSpeakers)
      && !isHidden(current)
      ? current.text
      : null;
  useEffect(() => {
    if (readText !== null) speak(readText);
    // Leaving the mode (unmount), toggling auto-read off, or advancing to a silent line should all
    // stop any in-flight speech rather than let it talk over what's next.
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [readText]);

  if (current === undefined) return null;

  // Advancing floats the bubbles up and stepping back floats them down, so a step reads as movement
  // through the dialogue instead of a swap. A CSS enter animation only replays on a fresh element, so
  // each slot's key carries its line id to force a remount per step — and the two keys are prefixed
  // per slot, because a bare line id is shared by both slots for one step (the current line becomes
  // the prior one) and React would then *move* that node between slots instead of remounting it,
  // leaving whichever bubble it reused sitting still while the other floated.
  const float = cn(
    `
      animate-in duration-300 fade-in
      motion-reduce:animate-none
    `,
    direction === "forward" ? "slide-in-from-bottom-4" : "slide-in-from-top-4",
  );

  return (
    <div className="space-y-4">
      <FuriganaScope>
        <ChatMessageList>
          {prior && (
            <DialogueLineBubble
              key={`prior-${prior.id}`}
              line={prior}
              selfSpeakers={selfSpeakers}
              showTranslation={showTranslations}
              hidden={isHidden(prior)}
              onReveal={() => reveal(prior.id)}
              className={cn("opacity-40", float)}
            />
          )}
          <DialogueLineBubble
            key={`current-${current.id}`}
            line={current}
            selfSpeakers={selfSpeakers}
            showTranslation={showTranslations}
            hidden={isHidden(current)}
            onReveal={() => reveal(current.id)}
            className={float}
          />
        </ChatMessageList>
      </FuriganaScope>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-sm text-muted-foreground"
          aria-live="polite"
        >
          Line {clamped + 1} of {lines.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={clamped === 0}
            onClick={() => go(Math.max(0, clamped - 1), "back")}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {atEnd
            ? (
              <Button
                type="button"
                size="sm"
                onClick={() => go(0, "back")}
              >
                <RotateCcw className="size-4" />
                Start over
              </Button>
            )
            : (
              <Button
                type="button"
                size="sm"
                onClick={() => go(clamped + 1, "forward")}
              >
                Next line
                <ArrowRight className="size-4" />
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}
