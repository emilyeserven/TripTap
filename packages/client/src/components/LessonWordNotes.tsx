import type { LessonWordNote } from "@sentence-bank/types";

import { Plus, Trash2 } from "lucide-react";
import { toKana } from "wanakana";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/id";
import { useUiStore } from "@/stores/uiStore";

type WordNoteStatus = LessonWordNote["status"];

/**
 * The word-note editor for a lesson — adapted from the Reading Session word-note block, but every
 * field is optional (a row is kept only if at least one of word/reading/meaning/notes is filled), the
 * Reading input is always kana-only (romaji auto-converts, never kanji), and each row has a freeform
 * Notes field for when only the meaning or a reading-to-look-up-later is known.
 */
export function LessonWordNotes({
  wordNotes,
  onChange,
}: {
  wordNotes: LessonWordNote[];
  onChange: (wordNotes: LessonWordNote[]) => void;
}) {
  const kanaScript = useUiStore(s => s.kanaScript);

  const toKanaInput = (raw: string) =>
    toKana(raw, {
      IMEMode: kanaScript === "katakana" ? "toKatakana" : "toHiragana",
    });

  const addWordNote = () =>
    onChange([...wordNotes, {
      id: newId(),
      word: null,
      reading: null,
      meaning: null,
      notes: null,
      status: "shaky",
      flashcard: false,
    }]);
  const patchWord = (id: string, patch: Partial<LessonWordNote>) =>
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
            Every field is optional — fill in whatever you know. Reading is kana-only.
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
                    value={w.word ?? ""}
                    onChange={e => patchWord(w.id, {
                      word: e.target.value,
                    })}
                    placeholder="Word (optional)"
                    aria-label="Word"
                  />
                  <Input
                    value={w.reading ?? ""}
                    onChange={e => patchWord(w.id, {
                      reading: toKanaInput(e.target.value),
                    })}
                    placeholder="Reading — kana (optional)"
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
                <Textarea
                  value={w.notes ?? ""}
                  onChange={e => patchWord(w.id, {
                    notes: e.target.value,
                  })}
                  placeholder="Notes (optional)"
                  aria-label="Word notes"
                  rows={2}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1">
                    {(["shaky", "unknown"] as WordNoteStatus[]).map(status => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={w.status === status ? "default" : "outline"}
                        onClick={() => patchWord(w.id, {
                          status,
                        })}
                      >
                        {status === "shaky" ? "Shaky" : "Didn't know"}
                      </Button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={w.flashcard}
                      onCheckedChange={v => patchWord(w.id, {
                        flashcard: v === true,
                      })}
                    />
                    Add to flashcards later
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-destructive"
                    onClick={() => removeWord(w.id)}
                    aria-label="Delete word"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
