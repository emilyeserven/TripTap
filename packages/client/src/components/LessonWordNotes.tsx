import type { LessonWordNote } from "@sentence-bank/types";

import { Plus, Trash2 } from "lucide-react";
import { toKana } from "wanakana";

import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/id";
import { WORD_COLUMN_CLASS } from "@/lib/lessonLayout";
import { cn } from "@/lib/utils";
import { useDisplayStore } from "@/stores/displayStore";
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
  bare = false,
}: {
  wordNotes: LessonWordNote[];
  onChange: (wordNotes: LessonWordNote[]) => void;
  /** Render content without the `CollapsibleSection` wrapper (the caller supplies the section
   * container); the "Add word" button moves to the top of the body. */
  bare?: boolean;
}) {
  const kanaScript = useUiStore(s => s.kanaScript);
  const wordColumns = useDisplayStore(s => s.lessonWordColumns);

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

  const addButton = (
    <Button
      type="button"
      size="sm"
      onClick={addWordNote}
    >
      <Plus className="size-4" />
      Add word
    </Button>
  );

  const body = (
    <>
      {wordNotes.length === 0
        ? <p className="text-sm text-muted-foreground">No words noted yet.</p>
        : (
          <ul className={cn(WORD_COLUMN_CLASS[wordColumns], "items-start")}>
            {wordNotes.map(w => (
              <li
                key={w.id}
                className="@container space-y-2 rounded-md border p-3"
              >
                <div
                  className="
                    grid gap-2
                    @md:grid-cols-3
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

      {wordNotes.length > 0
        ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addWordNote}
          >
            <Plus className="size-4" />
            Add word
          </Button>
        )
        : null}
    </>
  );

  if (bare) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{addButton}</div>
        {body}
      </div>
    );
  }

  return (
    <CollapsibleSection
      title="Word notes"
      description="Every field is optional — fill in whatever you know. Reading is kana-only."
      action={addButton}
    >
      {body}
    </CollapsibleSection>
  );
}
