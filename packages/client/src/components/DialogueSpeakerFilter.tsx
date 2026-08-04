import type { DialogueLine } from "@sentence-bank/types";

import { dialogueLineCounts, dialogueSpeakers, isSelfSpeaker } from "@sentence-bank/types";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { speakerAccent } from "@/lib/dialogue";
import { cn } from "@/lib/utils";

/**
 * The practice controls above a transcript: one toggle per speaker, hiding that speaker's lines so
 * the learner has to produce them. Hiding "私" is the common case — it turns the dialogue into a
 * prompt where everyone else speaks and the learner fills in their own half.
 */
export function DialogueSpeakerFilter({
  lines,
  selfSpeakers,
  hiddenSpeakers,
  onChange,
}: {
  lines: DialogueLine[] | null;
  selfSpeakers?: string[] | null;
  hiddenSpeakers: string[];
  onChange: (next: string[]) => void;
}) {
  const speakers = dialogueSpeakers(lines);
  const counts = dialogueLineCounts(lines);
  if (speakers.length === 0) return null;

  const toggle = (speaker: string) => {
    onChange(
      hiddenSpeakers.includes(speaker)
        ? hiddenSpeakers.filter(s => s !== speaker)
        : [...hiddenSpeakers, speaker],
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Hide for practice:</span>
      {speakers.map((speaker) => {
        const hidden = hiddenSpeakers.includes(speaker);
        const self = isSelfSpeaker(speaker, selfSpeakers);
        return (
          <button
            key={speaker}
            type="button"
            aria-pressed={hidden}
            onClick={() => toggle(speaker)}
            className={cn(
              `
                inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
                text-xs font-medium transition-colors
                focus-visible:ring-2 focus-visible:ring-ring
                focus-visible:outline-none
              `,
              hidden
                ? `
                  border-transparent bg-muted text-muted-foreground line-through
                `
                : "border-border",
            )}
          >
            <span
              aria-hidden
              className={cn(
                `
                  flex size-4 items-center justify-center rounded-full
                  text-[10px]
                `,
                self ? "bg-primary text-primary-foreground" : speakerAccent(speaker),
              )}
            >
              {hidden
                ? <EyeOffIcon className="size-2.5" />
                : (
                  <EyeIcon
                    className="size-2.5"
                  />
                )}
            </span>
            {speaker}
            <span className="text-muted-foreground">{counts[speaker] ?? 0}</span>
          </button>
        );
      })}
      {hiddenSpeakers.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
        >
          Show all
        </Button>
      )}
    </div>
  );
}
