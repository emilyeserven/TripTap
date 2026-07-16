import type { SentenceMark } from "@sentence-bank/types";

import { useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deriveCorrection } from "@/lib/deriveCorrection";
import { CorrectMark, IncorrectMark } from "@/lib/tiptap/correctionMarks";
import { TrackChanges } from "@/lib/tiptap/trackChanges";

export interface SentenceCorrectionResult {
  correction: string;
  marks: SentenceMark[];
  reasoning: string | null;
}

/**
 * Inline correction editor for one un-reviewed sentence — a single editable **and** markable sentence
 * (track-changes model). It starts as the learner's original; selecting a span and choosing **Incorrect**
 * strikes it through and drops it from the result, **Correct** keeps it (green), and typing/backspacing
 * edits inline. The corrected sentence is derived from these edits. Once anything is edited, a reasoning
 * field + Save appear; Save commits `{ correction, marks, reasoning }` together via `onSave`.
 */
export function SentenceCorrector({
  text,
  reasoning: initialReasoning,
  onSave,
  saveLabel = "Save correction",
}: {
  text: string;
  reasoning?: string | null;
  onSave: (result: SentenceCorrectionResult) => void;
  saveLabel?: string;
}) {
  const [reasoning, setReasoning] = useState(initialReasoning ?? "");
  const [derived, setDerived] = useState<{ correction: string;
    marks: SentenceMark[]; }>(() => ({
    correction: text,
    marks: [],
  }));
  // Reveal the surrounding chrome only once the learner has started changing the sentence.
  const [hasEdited, setHasEdited] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, CorrectMark, IncorrectMark, TrackChanges],
    content: text,
    editorProps: {
      attributes: {
        class: "outline-none whitespace-pre-wrap min-h-8",
      },
    },
    onUpdate: ({
      editor,
    }) => {
      setDerived(deriveCorrection(editor.getJSON()));
      setHasEdited(true);
    },
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {hasEdited ? <Label>Correct the sentence</Label> : null}
        {editor
          ? (
            <BubbleMenu
              editor={editor}
              shouldShow={({
                from, to,
              }) => from !== to}
              className="
                flex items-center gap-1 rounded-md border bg-popover p-1
                shadow-md
              "
            >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="
                  text-emerald-700
                  dark:text-emerald-400
                "
                onClick={() => editor.chain().focus().toggleMark("correct").run()}
              >
                Correct
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => editor.chain().focus().toggleMark("incorrect").run()}
              >
                Incorrect
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => editor.chain().focus().unsetMark("correct").unsetMark("incorrect").run()}
              >
                Clear
              </Button>
            </BubbleMenu>
          )
          : null}
        <EditorContent
          editor={editor}
          className="
            rounded-md border bg-background px-3 py-2 text-xl font-semibold
            focus-within:ring-2 focus-within:ring-ring
          "
        />
      </div>

      {hasEdited
        ? (
          <>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Result</span>
              <p className="text-base">
                {derived.correction.trim() || (
                  <span className="text-muted-foreground italic">(empty)</span>
                )}
              </p>
            </div>

            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="corrector-reason">Explanation</Label>
                <Textarea
                  id="corrector-reason"
                  value={reasoning}
                  onChange={e => setReasoning(e.target.value)}
                  placeholder="Why it was wrong — optional, Markdown supported"
                  rows={2}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => onSave({
                  correction: derived.correction,
                  marks: derived.marks,
                  reasoning: reasoning.trim() || null,
                })}
              >
                {saveLabel}
              </Button>
            </div>
          </>
        )
        : null}
    </div>
  );
}
