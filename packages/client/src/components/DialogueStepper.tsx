import type { DialogueLine } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { isSelfSpeaker } from "@sentence-bank/types";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { speak } from "@/components/ai-lesson/speak";
import { DialogueLineBubble } from "@/components/DialogueLineBubble";
import { Button } from "@/components/ui/button";
import { ChatMessageList } from "@/components/ui/chat-bubble";
import { useDialogueStepMotion } from "@/hooks/useDialogueStepMotion";
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
 *
 * A step is animated — the bubbles drift up on the way forward and down on the way back — by
 * `useDialogueStepMotion`, which measures them rather than re-mounting them.
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
  const listRef = useDialogueStepMotion(clamped, direction);
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

  // Both bubbles are keyed by line id alone, in one keyspace, so the line that steps from the current
  // slot into the prior one is *moved* by React rather than re-created. Keeping that node is what
  // stops it flashing: it is already on screen, so it should glide and dim, never blink out and fade
  // back in. `useDialogueStepMotion` does the gliding; the dimming is this CSS transition.
  const settle = `
    transition-opacity duration-300
    motion-reduce:transition-none
  `;

  return (
    <div className="space-y-4">
      <FuriganaScope>
        <ChatMessageList ref={listRef}>
          {prior && (
            <DialogueLineBubble
              key={prior.id}
              line={prior}
              selfSpeakers={selfSpeakers}
              showTranslation={showTranslations}
              hidden={isHidden(prior)}
              onReveal={() => reveal(prior.id)}
              className={cn("opacity-40", settle)}
            />
          )}
          <DialogueLineBubble
            key={current.id}
            line={current}
            selfSpeakers={selfSpeakers}
            showTranslation={showTranslations}
            hidden={isHidden(current)}
            onReveal={() => reveal(current.id)}
            className={settle}
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
