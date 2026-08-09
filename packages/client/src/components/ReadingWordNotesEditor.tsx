import type { WordNote } from "@sentence-bank/types";

import { Plus } from "lucide-react";
import { toKana } from "wanakana";

import { AddSentenceFromWordNoteDialog } from "@/components/AddSentenceFromWordNoteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WordExampleLookup } from "@/components/WordExampleLookup";
import { WordLookup } from "@/components/WordLookup";
import { WordNoteControls } from "@/components/WordNoteControls";
import { blockEnterSubmit } from "@/lib/forms";
import { newId } from "@/lib/id";
import { useUiStore } from "@/stores/uiStore";

/**
 * The word-notes section of the reading-session form: words the learner was shaky on or didn't
 * know, each with reading/meaning fields and the shared status/flashcard/delete controls. The
 * parent owns the array.
 */
export function ReadingWordNotesEditor({
  wordNotes,
  onChange,
  language,
}: {
  wordNotes: WordNote[];
  onChange: (wordNotes: WordNote[]) => void;
  /** The reading session's language, seeded into a sentence made from a word note. */
  language: string;
}) {
  const kanaScript = useUiStore(s => s.kanaScript);

  const toKanaInput = (raw: string) =>
    toKana(raw, {
      IMEMode: kanaScript === "katakana" ? "toKatakana" : "toHiragana",
    });

  const addWordNote = () =>
    onChange([...wordNotes, {
      id: newId(),
      word: "",
      reading: null,
      meaning: null,
      status: "shaky",
      flashcard: false,
      flashcardMadeAt: null,
      mySentenceId: null,
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
                  <div className="flex gap-2">
                    <Input
                      value={w.word}
                      onChange={e => patchWord(w.id, {
                        word: e.target.value,
                      })}
                      onKeyDown={blockEnterSubmit}
                      placeholder="Word"
                      aria-label="Word"
                    />
                    <WordLookup
                      word={w.word}
                      onPick={entry => patchWord(w.id, {
                        word: entry.word,
                        // Route the reading through the kana-only transform to keep that invariant here.
                        reading: toKanaInput(entry.reading),
                        meaning: entry.meanings.slice(0, 3).join("; "),
                      })}
                    />
                    <WordExampleLookup word={w.word} />
                  </div>
                  <Input
                    value={w.reading ?? ""}
                    onChange={e => patchWord(w.id, {
                      reading: toKanaInput(e.target.value),
                    })}
                    onKeyDown={blockEnterSubmit}
                    placeholder="Reading — kana (optional)"
                    aria-label="Reading"
                  />
                  <Input
                    value={w.meaning ?? ""}
                    onChange={e => patchWord(w.id, {
                      meaning: e.target.value,
                    })}
                    onKeyDown={blockEnterSubmit}
                    placeholder="Meaning (optional)"
                    aria-label="Meaning"
                  />
                </div>
                <WordNoteControls
                  status={w.status}
                  flashcard={w.flashcard}
                  flashcardMadeAt={w.flashcardMadeAt}
                  onStatusChange={status => patchWord(w.id, {
                    status,
                  })}
                  onFlashcardChange={flashcard => patchWord(w.id, {
                    flashcard,
                  })}
                  onFlashcardMadeChange={made => patchWord(w.id, {
                    flashcardMadeAt: made ? new Date().toISOString() : null,
                  })}
                  onDelete={() => removeWord(w.id)}
                />
                <AddSentenceFromWordNoteDialog
                  note={w}
                  language={language}
                  onLinked={mySentenceId => patchWord(w.id, {
                    mySentenceId,
                  })}
                />
              </li>
            ))}
          </ul>
        )}

      {/* A second add button at the bottom, so you can note another word without scrolling back up. */}
      {wordNotes.length > 0
        ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWordNote}
          >
            <Plus className="size-4" />
            New word
          </Button>
        )
        : null}
    </div>
  );
}
