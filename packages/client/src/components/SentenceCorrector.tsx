import type { SentenceMark } from "@sentence-bank/types";

import { useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Check } from "lucide-react";

import { ExplanationSyntaxHint } from "@/components/ExplanationSyntaxHint";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deriveCorrection } from "@/lib/deriveCorrection";
import { CorrectMark, IncorrectMark } from "@/lib/tiptap/correctionMarks";
import { markedContent } from "@/lib/tiptap/markedContent";
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
 *
 * A sentence that was already right can be saved too, via "No changes needed" — that reveals the same
 * explanation field without requiring an edit, so a correct sentence can still carry a note. Callers
 * detect this case by comparing the returned `correction` with the text they passed in.
 */
export function SentenceCorrector({
  text,
  marks,
  reasoning: initialReasoning,
  onSave,
  saveLabel = "Save correction",
  startWithNote = false,
}: {
  text: string;
  /** Existing correct-spans to re-apply when re-opening a correction; omit for a fresh one. */
  marks?: SentenceMark[] | null;
  reasoning?: string | null;
  onSave: (result: SentenceCorrectionResult) => void;
  saveLabel?: string;
  /** Open straight into "just add a note" mode (the explanation field), skipping the toggle. */
  startWithNote?: boolean;
}) {
  const [reasoning, setReasoning] = useState(initialReasoning ?? "");
  const [derived, setDerived] = useState<{ correction: string;
    marks: SentenceMark[]; }>(() => ({
    correction: text,
    // Keep the existing marks so a re-opened correction saved without further edits doesn't lose them.
    marks: marks ?? [],
  }));
  // Reveal the surrounding chrome only once the learner has started changing the sentence — or has
  // said it needs no change, so an already-correct sentence can still be saved with an explanation.
  const [hasEdited, setHasEdited] = useState(false);
  const [noChangeNeeded, setNoChangeNeeded] = useState(startWithNote);
  const showDetails = hasEdited || noChangeNeeded;

  const editor = useEditor({
    extensions: [StarterKit, CorrectMark, IncorrectMark, TrackChanges],
    // Seed with the saved correct-spans highlighted (falls back to plain text for a fresh correction).
    content: marks && marks.length > 0 ? markedContent(text, marks) : text,
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
        {showDetails ? <Label>Correct the sentence</Label> : null}
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

      {showDetails
        ? null
        : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="
              h-auto px-0 py-0.5 text-xs font-normal text-muted-foreground
              hover:bg-transparent hover:text-foreground
            "
            onClick={() => setNoChangeNeeded(true)}
          >
            <Check className="size-3" />
            No changes needed — just add a note
          </Button>
        )}

      {showDetails
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
                  placeholder="Why it was wrong — optional"
                  rows={2}
                />
                <ExplanationSyntaxHint
                  explanation={reasoning}
                  target={derived.correction}
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
