import type { DialogueLine } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { isSelfSpeaker } from "@sentence-bank/types";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { speak } from "@/components/ai-lesson/speak";
import { DialogueLineBubble } from "@/components/DialogueLineBubble";
import { Button } from "@/components/ui/button";
import { ChatMessageList } from "@/components/ui/chat-bubble";

/**
 * Steps through a dialogue one line at a time: the prior line stays visible but faded, the current
 * line is full-strength, and the learner advances at their own pace. That pacing is the practice —
 * each turn arrives alone, so the learner responds to it before seeing what comes next.
 *
 * With `autoRead` on, a line spoken by anyone who isn't the learner is read aloud when it appears,
 * which turns the stepper into a one-sided conversation partner: the app says the other side's turn,
 * the learner says theirs. Narration lines (no speaker) are never read.
 */
export function DialogueStepper({
  lines,
  selfSpeakers,
  autoRead = false,
  showTranslations = false,
}: {
  lines: DialogueLine[];
  selfSpeakers?: string[] | null;
  /** When on, non-self lines are spoken via the Web Speech API as they become current. */
  autoRead?: boolean;
  /** When off, translations stay behind the app's standard blur-to-reveal. */
  showTranslations?: boolean;
}) {
  const [index, setIndex] = useState(0);

  const clamped = Math.min(index, Math.max(0, lines.length - 1));
  const current = lines.length > 0 ? lines[clamped] : undefined;
  const prior = clamped > 0 ? lines[clamped - 1] : null;
  const atEnd = clamped >= lines.length - 1;

  // A primitive dep (the text, or null when nothing should be read) keeps the effect from re-firing
  // on unrelated rerenders — line objects change identity whenever the parent re-renders.
  const readText
    = autoRead && current !== undefined && current.speaker !== null
      && !isSelfSpeaker(current.speaker, selfSpeakers)
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

  return (
    <div className="space-y-4">
      <FuriganaScope>
        <ChatMessageList>
          {prior && (
            <DialogueLineBubble
              line={prior}
              selfSpeakers={selfSpeakers}
              showTranslation={showTranslations}
              className="opacity-40"
            />
          )}
          <DialogueLineBubble
            line={current}
            selfSpeakers={selfSpeakers}
            showTranslation={showTranslations}
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
            onClick={() => setIndex(i => Math.max(0, i - 1))}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {atEnd
            ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setIndex(0)}
              >
                <RotateCcw className="size-4" />
                Start over
              </Button>
            )
            : (
              <Button
                type="button"
                size="sm"
                onClick={() => setIndex(i => i + 1)}
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
