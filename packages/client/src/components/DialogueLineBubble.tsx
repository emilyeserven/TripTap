import type { DialogueLine } from "@sentence-bank/types";

import { isSelfSpeaker } from "@sentence-bank/types";

import { SentenceText } from "@/components/SentenceText";
import { SentenceTranslationReveal } from "@/components/SentenceTranslationReveal";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleCaption,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { speakerAccent, speakerInitial } from "@/lib/dialogue";
import { cn } from "@/lib/utils";

/**
 * One dialogue line: the learner's own lines ("私"/"Me", plus any `selfSpeakers`) sit on the right,
 * every other speaker gets a left-hand row with a colour that stays stable for that name, and an
 * unattributed line renders as centred narration. Shared between the full transcript and the
 * line-by-line stepper so a line looks identical in both.
 *
 * With `hidden` on, the bubble keeps its footprint but shows a placeholder in place of the words —
 * the line's `hint` if it has one ("say you're fine and ask back"), otherwise bare dots — and
 * clicking it calls `onReveal`. That's what makes a dialogue practisable: the shape of the
 * conversation stays visible while the words are not, and a hint still tells the learner what the
 * turn is *for*. Narration has no speaker to hide, so it is never hidden.
 */
export function DialogueLineBubble({
  line,
  selfSpeakers,
  showTranslation = false,
  hidden = false,
  onReveal,
  className,
}: {
  line: DialogueLine;
  selfSpeakers?: string[] | null;
  /** When off, the translation stays behind the app's standard blur-to-reveal. */
  showTranslation?: boolean;
  /** When on, the words (and translation) are replaced by a click-to-reveal placeholder. */
  hidden?: boolean;
  /** Called when the learner reveals a hidden line, by click or keyboard. */
  onReveal?: () => void;
  /** Merged onto the outer wrapper — the stepper fades its prior line with this. */
  className?: string;
}) {
  const self = isSelfSpeaker(line.speaker, selfSpeakers);
  const variant = self ? "sent" : "received";

  // An unattributed line is narration, not an utterance — centre it and skip the avatar.
  if (line.speaker === null) {
    return (
      <p
        className={cn(
          `
            self-center px-4 py-1 text-center text-xs text-muted-foreground
            italic
          `,
          className,
        )}
      >
        {line.text}
      </p>
    );
  }

  // The translation sits outside the bubble row, indented past the avatar's width, so the
  // avatar keeps aligning with the bubble instead of sinking to the bottom of a taller row.
  return (
    <div
      className={cn(
        "flex max-w-full flex-col gap-1",
        self ? "items-end self-end" : "items-start self-start",
        className,
      )}
    >
      <ChatBubble variant={variant}>
        <ChatBubbleAvatar
          fallback={speakerInitial(line.speaker)}
          fallbackClassName={self ? "bg-primary text-primary-foreground" : speakerAccent(line.speaker)}
          aria-hidden
        />
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1",
            self ? "items-end" : "items-start",
          )}
        >
          <ChatBubbleCaption>{line.speaker}</ChatBubbleCaption>
          {hidden
            ? (
              <ChatBubbleMessage
                variant={variant}
                role="button"
                tabIndex={0}
                aria-label={
                  line.hint
                    ? `Reveal ${line.speaker}'s line — ${line.hint}`
                    : `Reveal ${line.speaker}'s line`
                }
                className={cn(
                  "cursor-pointer opacity-70",
                  // A hint reads as a stage direction; the bare placeholder is just dots.
                  line.hint ? "text-left italic" : "tracking-[0.3em]",
                )}
                onClick={onReveal}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onReveal?.();
                  }
                }}
              >
                {line.hint ?? "•••"}
              </ChatBubbleMessage>
            )
            : (
              <ChatBubbleMessage variant={variant}>
                <SentenceText
                  text={line.text}
                  reading={line.reading}
                />
              </ChatBubbleMessage>
            )}
        </div>
      </ChatBubble>
      {/* A hidden line's translation would answer it, so it waits for the reveal too. */}
      {!hidden && (
        <div className={self ? "pr-10" : "pl-10"}>
          <SentenceTranslationReveal
            translation={line.translation}
            showTranslation={showTranslation}
          />
        </div>
      )}
    </div>
  );
}
