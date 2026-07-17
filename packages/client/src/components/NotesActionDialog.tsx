import type { HighlightAction } from "@/components/NotesHighlightMenu";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** The field values collected for a highlight action; unused fields stay empty. */
export interface HighlightDraft {
  text: string;
  reading: string;
  meaning: string;
  en: string;
  translation: string;
}

const DIALOG_TITLES: Record<HighlightAction, string> = {
  word: "Add a word card",
  prompt: "Add a writing prompt",
  sentence: "Add a sentence",
};

/**
 * The details dialog opened from a notes-highlight action, pre-filled with the captured selection.
 * Owns the draft fields; remount it (via `key`) when the pending action changes so they re-seed.
 */
export function NotesActionDialog({
  action,
  initialText,
  busy,
  onSubmit,
  onClose,
}: {
  action: HighlightAction;
  initialText: string;
  busy: boolean;
  onSubmit: (draft: HighlightDraft) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [en, setEn] = useState("");
  const [translation, setTranslation] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLES[action]}</DialogTitle>
        </DialogHeader>

        {action === "word"
          ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Word</Label>
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Reading</Label>
                <Input
                  value={reading}
                  onChange={e => setReading(e.target.value)}
                  placeholder="Kana reading (optional)…"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Meaning</Label>
                <Input
                  value={meaning}
                  onChange={e => setMeaning(e.target.value)}
                  placeholder="Meaning (optional)…"
                />
              </div>
            </div>
          )
          : null}

        {action === "prompt"
          ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Japanese</Label>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">English</Label>
                <Textarea
                  value={en}
                  onChange={e => setEn(e.target.value)}
                  placeholder="English version (optional)…"
                  rows={3}
                />
              </div>
            </div>
          )
          : null}

        {action === "sentence"
          ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Sentence</Label>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Translation</Label>
                <Textarea
                  value={translation}
                  onChange={e => setTranslation(e.target.value)}
                  placeholder="Translation (optional)…"
                  rows={3}
                />
              </div>
            </div>
          )
          : null}

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onSubmit({
              text,
              reading,
              meaning,
              en,
              translation,
            })}
            disabled={!text.trim() || busy}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
