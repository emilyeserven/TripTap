import type { WordNoteStatus } from "@sentence-bank/types";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * The shared control row for one word note: the Shaky / Didn't-know status toggle, the
 * add-to-flashcards checkbox, and the delete button. Used by the lesson and reading-session
 * word-note editors. When the note is flagged for a flashcard and the caller wires
 * `onFlashcardMadeChange`, a second "Made" checkbox records that the card actually got created
 * (checking stamps `flashcardMadeAt`; unchecking clears it).
 */
export function WordNoteControls({
  status,
  flashcard,
  flashcardMadeAt,
  onStatusChange,
  onFlashcardChange,
  onFlashcardMadeChange,
  onDelete,
}: {
  status: WordNoteStatus;
  flashcard: boolean;
  flashcardMadeAt?: string | null;
  onStatusChange: (status: WordNoteStatus) => void;
  onFlashcardChange: (flashcard: boolean) => void;
  onFlashcardMadeChange?: (made: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        {(["shaky", "unknown"] as WordNoteStatus[]).map(s => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => onStatusChange(s)}
          >
            {s === "shaky" ? "Shaky" : "Didn't know"}
          </Button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={flashcard}
          onCheckedChange={v => onFlashcardChange(v === true)}
        />
        Add to flashcards later
      </label>
      {flashcard && onFlashcardMadeChange && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={Boolean(flashcardMadeAt)}
            onCheckedChange={v => onFlashcardMadeChange(v === true)}
          />
          Made
        </label>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto text-destructive"
        onClick={onDelete}
        aria-label="Delete word"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
