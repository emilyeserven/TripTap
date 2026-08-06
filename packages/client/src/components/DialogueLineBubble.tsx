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
 * One visible dialogue line: the learner's own lines ("私"/"Me", plus any `selfSpeakers`) sit on the
 * right, every other speaker gets a left-hand row with a colour that stays stable for that name, and
 * an unattributed line renders as centred narration. Shared between the full transcript and the
 * line-by-line stepper so a line looks identical in both.
 */
export function DialogueLineBubble({
  line,
  selfSpeakers,
  showTranslation = false,
  className,
}: {
  line: DialogueLine;
  selfSpeakers?: string[] | null;
  /** When off, the translation stays behind the app's standard blur-to-reveal. */
  showTranslation?: boolean;
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
          <ChatBubbleMessage variant={variant}>
            <SentenceText
              text={line.text}
              reading={line.reading}
            />
          </ChatBubbleMessage>
        </div>
      </ChatBubble>
      <div className={self ? "pr-10" : "pl-10"}>
        <SentenceTranslationReveal
          translation={line.translation}
          showTranslation={showTranslation}
        />
      </div>
    </div>
  );
}
