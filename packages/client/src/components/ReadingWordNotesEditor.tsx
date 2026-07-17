import type { WordNote } from "@sentence-bank/types";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WordNoteControls } from "@/components/WordNoteControls";
import { newId } from "@/lib/id";

/**
 * The word-notes section of the reading-session form: words the learner was shaky on or didn't
 * know, each with reading/meaning fields and the shared status/flashcard/delete controls. The
 * parent owns the array.
 */
export function ReadingWordNotesEditor({
  wordNotes,
  onChange,
}: {
  wordNotes: WordNote[];
  onChange: (wordNotes: WordNote[]) => void;
}) {
  const addWordNote = () =>
    onChange([...wordNotes, {
      id: newId(),
      word: "",
      reading: null,
      meaning: null,
      status: "shaky",
      flashcard: false,
    }]);
  const patchWord = (id: string, patch: Partial<WordNote>) =>
    onChange(wordNotes.map(w => (w.id === id
      ? {
        ...w,
        ...patch,
      }
      : w)));
  const removeWord = (id: string) => onChange(wordNotes.filter(w => w.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Word notes</Label>
          <p className="text-xs text-muted-foreground">
            Words you were shaky on or didn’t know. Flag any you want on a flashcard list later.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addWordNote}
        >
          <Plus className="size-4" />
          Add word
        </Button>
      </div>

      {wordNotes.length === 0
        ? <p className="text-sm text-muted-foreground">No words noted yet.</p>
        : (
          <ul className="space-y-3">
            {wordNotes.map(w => (
              <li
                key={w.id}
                className="space-y-2 rounded-md border p-3"
              >
                <div
                  className="
                    grid gap-2
                    sm:grid-cols-3
                  "
                >
                  <Input
                    value={w.word}
                    onChange={e => patchWord(w.id, {
                      word: e.target.value,
                    })}
                    placeholder="Word"
                    aria-label="Word"
                  />
                  <Input
                    value={w.reading ?? ""}
                    onChange={e => patchWord(w.id, {
                      reading: e.target.value,
                    })}
                    placeholder="Reading (optional)"
                    aria-label="Reading"
                  />
                  <Input
                    value={w.meaning ?? ""}
                    onChange={e => patchWord(w.id, {
                      meaning: e.target.value,
                    })}
                    placeholder="Meaning (optional)"
                    aria-label="Meaning"
                  />
                </div>
                <WordNoteControls
                  status={w.status}
                  flashcard={w.flashcard}
                  onStatusChange={status => patchWord(w.id, {
                    status,
                  })}
                  onFlashcardChange={flashcard => patchWord(w.id, {
                    flashcard,
                  })}
                  onDelete={() => removeWord(w.id)}
                />
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
