import type { LessonListeningNote } from "@sentence-bank/types";

import { useState } from "react";

import { Pencil, Trash2, X } from "lucide-react";
import { toKana } from "wanakana";

import { KanaEntryToggle } from "@/components/KanaEntryToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newId } from "@/lib/id";
import { useUiStore } from "@/stores/uiStore";

/**
 * The note-logging surface for a lesson's listening section — the {@link SessionNotes} note-taker with
 * the video/stopwatch timestamp logic stripped out. In kana-only entry mode (the global pref, toggled
 * via {@link KanaEntryToggle}) the note field converts typed romaji to kana (never kanji) and a second
 * untranslated English-context field appears. Enter in either field adds the note.
 */
export function LessonListeningNotes({
  notes,
  onChange,
}: {
  notes: LessonListeningNote[];
  onChange: (notes: LessonListeningNote[]) => void;
}) {
  const kanaEntry = useUiStore(s => s.kanaEntry);
  const kanaScript = useUiStore(s => s.kanaScript);
  const [inputValue, setInputValue] = useState("");
  const [contextValue, setContextValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editContext, setEditContext] = useState("");

  const toKanaInput = (raw: string) =>
    toKana(raw, {
      IMEMode: kanaScript === "katakana" ? "toKatakana" : "toHiragana",
    });

  const submit = () => {
    const text = inputValue.trim();
    if (!text) return;
    const context = kanaEntry ? contextValue.trim() : "";
    onChange([
      ...notes,
      {
        id: newId(),
        text,
        context: context || null,
      },
    ]);
    setInputValue("");
    setContextValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const startEdit = (note: LessonListeningNote) => {
    setEditingId(note.id);
    setEditText(note.text);
    setEditContext(note.context ?? "");
  };

  const saveEdit = () => {
    const text = editText.trim();
    if (!editingId || !text) return;
    const context = editContext.trim();
    onChange(notes.map(n =>
      n.id === editingId
        ? {
          ...n,
          text,
          context: context || null,
        }
        : n));
    setEditingId(null);
  };

  const remove = (id: string) => onChange(notes.filter(n => n.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Listening notes</Label>
          <p className="text-xs text-muted-foreground">
            Notes taken while listening. No timestamps — kana-only entry is available.
          </p>
        </div>
        <KanaEntryToggle />
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Input
            value={inputValue}
            onChange={e => setInputValue(kanaEntry ? toKanaInput(e.target.value) : e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={kanaEntry
              ? "Type romaji — converts to kana — and press Enter…"
              : "Type a note and press Enter…"}
            aria-label="Listening note"
          />
          {kanaEntry && (
            <Input
              value={contextValue}
              onChange={e => setContextValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="English context (optional, kept as-is)"
              aria-label="English context"
            />
          )}
        </div>
        <Button
          type="button"
          onClick={submit}
        >
          Add
        </Button>
      </div>

      {notes.length === 0
        ? <p className="text-sm text-muted-foreground">No notes yet.</p>
        : (
          <ul className="divide-y rounded-md border">
            {notes.map(note => (
              <li
                key={note.id}
                className="flex items-center gap-3 p-2"
              >
                {editingId === note.id
                  ? (
                    <>
                      <Input
                        value={editText}
                        onChange={e =>
                          setEditText(kanaEntry ? toKanaInput(e.target.value) : e.target.value)}
                        className="flex-1"
                        aria-label="Edit note"
                      />
                      {(kanaEntry || editContext !== "") && (
                        <Input
                          value={editContext}
                          onChange={e => setEditContext(e.target.value)}
                          className="flex-1"
                          placeholder="English context"
                          aria-label="Edit context"
                        />
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveEdit}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel edit"
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  )
                  : (
                    <>
                      <span className="flex-1 wrap-break-word">
                        {note.text}
                        {note.context && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            {note.context}
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(note)}
                        aria-label="Edit note"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove(note.id)}
                        aria-label="Delete note"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
