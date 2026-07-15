import type { ListeningEntry } from "@sentence-bank/types";

import { useState } from "react";

import { Keyboard, Pencil, Send, Trash2, X } from "lucide-react";
import { toKana } from "wanakana";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { newId } from "@/lib/id";
import { formatTime, parseSectionTime } from "@/lib/time";
import { useUiStore } from "@/stores/uiStore";

/**
 * The note-taking surface shared by listening and shadowing sessions: an input that stamps each note
 * with the current playback position and a table of captured notes. `getCurrentTimeMs` reads the live
 * player position; `source` records whether it came from the video or the stopwatch fallback. The
 * typing-start snapshot fires on the empty→non-empty transition (per the global timestamp-mode pref).
 *
 * In kana-only entry mode the note field converts typed romaji to kana (never kanji), and a second
 * untranslated English-context field appears; Enter in either field submits, and the typing-start stamp
 * is taken from whichever field the learner touches first.
 */
export function SessionNotes({
  entries,
  onChange,
  getCurrentTimeMs,
  source,
}: {
  entries: ListeningEntry[];
  onChange: (entries: ListeningEntry[]) => void;
  getCurrentTimeMs: () => number;
  source: "video" | "stopwatch";
}) {
  const timestampMode = useUiStore(s => s.timestampMode);
  const kanaEntry = useUiStore(s => s.kanaEntry);
  const kanaScript = useUiStore(s => s.kanaScript);
  const enterToAddNote = useUiStore(s => s.enterToAddNote);
  const setEnterToAddNote = useUiStore(s => s.setEnterToAddNote);
  const [inputValue, setInputValue] = useState("");
  const [contextValue, setContextValue] = useState("");
  const [typingStartMs, setTypingStartMs] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editContext, setEditContext] = useState("");
  const [editTime, setEditTime] = useState("");

  const toKanaInput = (raw: string) =>
    toKana(raw, {
      IMEMode: kanaScript === "katakana" ? "toKatakana" : "toHiragana",
    });

  // Snapshot the playback position the moment the learner starts composing a note. With two fields
  // enabled we stamp on the first keystroke into whichever field is touched first: fire only when both
  // fields were empty before this change and the field is now non-empty.
  const maybeMarkTypingStart = (nextNonEmpty: boolean) => {
    if (
      timestampMode === "typing-start"
      && inputValue === ""
      && contextValue === ""
      && nextNonEmpty
    ) {
      setTypingStartMs(getCurrentTimeMs());
    }
  };

  const handleInputChange = (raw: string) => {
    const value = kanaEntry ? toKanaInput(raw) : raw;
    maybeMarkTypingStart(value !== "");
    setInputValue(value);
  };

  const handleContextChange = (value: string) => {
    maybeMarkTypingStart(value !== "");
    setContextValue(value);
  };

  const submit = () => {
    const text = inputValue.trim();
    if (!text) return;
    const context = kanaEntry ? contextValue.trim() : "";
    const timestampMs = timestampMode === "typing-start" && typingStartMs !== null
      ? typingStartMs
      : getCurrentTimeMs();
    onChange([
      ...entries,
      {
        id: newId(),
        text,
        ...(context
          ? {
            context,
          }
          : {}),
        timestampMs,
        mode: timestampMode,
        source,
      },
    ]);
    setInputValue("");
    setContextValue("");
    setTypingStartMs(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ignore the Enter that confirms an IME candidate — otherwise a note is added mid-composition.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && enterToAddNote) {
      e.preventDefault();
      submit();
    }
  };

  const startEdit = (entry: ListeningEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
    setEditContext(entry.context ?? "");
    setEditTime(formatTime(entry.timestampMs));
  };

  const saveEdit = () => {
    const text = editText.trim();
    if (!editingId || !text) return;
    const context = editContext.trim();
    const parsed = parseSectionTime(editTime);
    onChange(entries.map(e =>
      e.id === editingId
        ? {
          ...e,
          text,
          context: context || undefined,
          timestampMs: parsed ?? e.timestampMs,
        }
        : e));
    setEditingId(null);
  };

  const remove = (id: string) => onChange(entries.filter(e => e.id !== id));

  const sorted = [...entries].sort((a, b) => a.timestampMs - b.timestampMs);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={enterToAddNote}
            onCheckedChange={setEnterToAddNote}
            aria-label="Enter adds note"
          />
          Enter adds note
        </label>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Input
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={kanaEntry
              ? "Type romaji — converts to kana — and press Enter…"
              : "Type a note and press Enter…"}
          />
          {kanaEntry && (
            <Input
              value={contextValue}
              onChange={e => handleContextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="English context (optional, kept as-is)"
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
      {timestampMode === "typing-start" && typingStartMs !== null && (
        <p className="text-xs text-muted-foreground">
          Timestamp:
          {" "}
          <span className="font-mono">{formatTime(typingStartMs)}</span>
        </p>
      )}

      {sorted.length === 0
        ? <p className="text-sm text-muted-foreground">No notes yet.</p>
        : (
          <ul className="divide-y rounded-md border">
            {sorted.map(entry => (
              <li
                key={entry.id}
                className="flex items-center gap-3 p-2"
              >
                {editingId === entry.id
                  ? (
                    <>
                      <Input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="flex-1"
                      />
                      {(kanaEntry || editContext !== "") && (
                        <Input
                          value={editContext}
                          onChange={e => setEditContext(e.target.value)}
                          className="flex-1"
                          placeholder="English context"
                          aria-label="Context"
                        />
                      )}
                      <Input
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        className="w-36 font-mono"
                        aria-label="Timestamp"
                      />
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
                      <span
                        className="text-muted-foreground"
                        title={entry.mode === "typing-start"
                          ? "Stamped when typing started"
                          : "Stamped at submit"}
                      >
                        {entry.mode === "typing-start"
                          ? <Keyboard className="size-4" />
                          : <Send className="size-4" />}
                      </span>
                      <span
                        className="
                          w-32 shrink-0 font-mono text-sm text-muted-foreground
                        "
                      >
                        {formatTime(entry.timestampMs)}
                      </span>
                      <span className="flex-1 wrap-break-word">
                        {entry.text}
                        {entry.context && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            {entry.context}
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(entry)}
                        aria-label="Edit note"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove(entry.id)}
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
