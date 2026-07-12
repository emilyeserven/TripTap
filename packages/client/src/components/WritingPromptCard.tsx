import type { WritingPrompt } from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * One saved writing prompt in the list. Read-only by default; the Edit button flips it into an
 * inline title/text form. Editing and deleting are delegated to the parent via callbacks.
 */
export function WritingPromptCard({
  prompt,
  onSave,
  onDelete,
}: {
  prompt: WritingPrompt;
  onSave: (input: { title: string;
    text: string; }) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(prompt.title);
  const [text, setText] = useState(prompt.text);

  const startEditing = () => {
    setTitle(prompt.title);
    setText(prompt.text);
    setEditing(true);
  };

  const save = () => {
    const nextTitle = title.trim();
    const nextText = text.trim();
    if (!nextTitle || !nextText) return;
    onSave({
      title: nextTitle,
      text: nextText,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="A short label"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Prompt</Label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What to write about…"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={save}
              disabled={!title.trim() || !text.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{prompt.title}</h2>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={startEditing}
              className="
                text-sm text-muted-foreground
                hover:underline
              "
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(prompt.id)}
              className="
                text-sm text-destructive
                hover:underline
              "
            >
              Delete
            </button>
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{prompt.text}</p>
      </CardContent>
    </Card>
  );
}
