import type { ListeningEntry } from "@sentence-bank/types";

import { useState } from "react";

import { Keyboard, Pencil, Send, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newId } from "@/lib/id";
import { formatTime, parseSectionTime } from "@/lib/time";
import { useUiStore } from "@/stores/uiStore";

/**
 * The note-taking surface shared by listening and shadowing sessions: an input that stamps each note
 * with the current playback position and a table of captured notes. `getCurrentTimeMs` reads the live
 * player position; `source` records whether it came from the video or the stopwatch fallback. The
 * typing-start snapshot fires on the empty→non-empty transition (per the global timestamp-mode pref).
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
  const [inputValue, setInputValue] = useState("");
  const [typingStartMs, setTypingStartMs] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTime, setEditTime] = useState("");

  const handleInputChange = (value: string) => {
    if (inputValue === "" && value !== "" && timestampMode === "typing-start") {
      setTypingStartMs(getCurrentTimeMs());
    }
    setInputValue(value);
  };

  const submit = () => {
    const text = inputValue.trim();
    if (!text) return;
    const timestampMs = timestampMode === "typing-start" && typingStartMs !== null
      ? typingStartMs
      : getCurrentTimeMs();
    onChange([
      ...entries,
      {
        id: newId(),
        text,
        timestampMs,
        mode: timestampMode,
        source,
      },
    ]);
    setInputValue("");
    setTypingStartMs(null);
  };

  const startEdit = (entry: ListeningEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
    setEditTime(formatTime(entry.timestampMs));
  };

  const saveEdit = () => {
    const text = editText.trim();
    if (!editingId || !text) return;
    const parsed = parseSectionTime(editTime);
    onChange(entries.map(e =>
      e.id === editingId
        ? {
          ...e,
          text,
          timestampMs: parsed ?? e.timestampMs,
        }
        : e));
    setEditingId(null);
  };

  const remove = (id: string) => onChange(entries.filter(e => e.id !== id));

  const sorted = [...entries].sort((a, b) => a.timestampMs - b.timestampMs);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a note and press Enter…"
        />
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
                      <span className="flex-1 wrap-break-word">{entry.text}</span>
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
