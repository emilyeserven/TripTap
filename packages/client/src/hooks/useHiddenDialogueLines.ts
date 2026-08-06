import type { DialogueLine } from "@sentence-bank/types";

import { useEffect, useState } from "react";

/**
 * Tracks which of a dialogue's hidden lines the learner has revealed, so hiding a speaker means the
 * same thing wherever a dialogue is rendered: their lines collapse to a placeholder, and revealing
 * one is per line rather than per speaker. Shared by the full transcript and the line-by-line
 * stepper.
 */
export function useHiddenDialogueLines(hiddenSpeakers: string[]): {
  /** True while this line's speaker is hidden and the learner hasn't revealed the line. */
  isHidden: (line: DialogueLine) => boolean;
  reveal: (id: string) => void;
} {
  const [revealed, setRevealed] = useState<string[]>([]);

  // Re-hiding a speaker should re-hide the lines of theirs that were revealed, so toggling the chip
  // off and on again gives a clean run rather than a transcript peppered with answers. Keyed on the
  // joined labels, not the array itself, so a caller passing a fresh array each render is harmless.
  const hiddenKey = hiddenSpeakers.join(" ");
  useEffect(() => {
    setRevealed([]);
  }, [hiddenKey]);

  return {
    isHidden: line =>
      line.speaker !== null
      && hiddenSpeakers.includes(line.speaker)
      && !revealed.includes(line.id),
    reveal: id => setRevealed(prev => [...prev, id]),
  };
}
