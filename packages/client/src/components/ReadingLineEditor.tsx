import type { ReadingLine, SentenceTermRef } from "@sentence-bank/types";

import { useState } from "react";

import { Scissors, Trash2 } from "lucide-react";

import { TermPicker } from "@/components/TermPicker";
import { TranslationVerdictPicker } from "@/components/TranslationVerdictPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/id";
import { splitSentences } from "@/lib/writing-corrections";

/** A blank line with a fresh id, ready to translate. */
function freshLine(text: string): ReadingLine {
  return {
    id: newId(),
    text,
    translation: null,
    summaryOnly: false,
    correction: null,
    note: null,
    verdict: null,
    needsCorrection: false,
    grammarTerms: null,
  };
}

/**
 * The line-by-line tab of the reading-session form: paste a passage, split it into lines, then
 * translate/summarise and optionally correct each line. The parent owns the lines array; this
 * component owns only the paste buffer.
 */
export function ReadingLineEditor({
  lines,
  onChange,
}: {
  lines: ReadingLine[];
  onChange: (lines: ReadingLine[]) => void;
}) {
  const [pasteBuffer, setPasteBuffer] = useState("");

  function splitIntoLines() {
    const next = pasteBuffer
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(freshLine);
    if (next.length) {
      onChange([...lines, ...next]);
      setPasteBuffer("");
    }
  }
  const patchLine = (id: string, patch: Partial<ReadingLine>) =>
    onChange(lines.map(l => (l.id === id
      ? {
        ...l,
        ...patch,
      }
      : l)));
  const removeLine = (id: string) => onChange(lines.filter(l => l.id !== id));

  /** Split one line's text into a line per sentence, replacing it in place. The first piece keeps the
   * original's translation/correction/tags; the rest start fresh. No-op when the text is a single
   * sentence. */
  function splitLine(id: string) {
    const index = lines.findIndex(l => l.id === id);
    if (index < 0) return;
    const line = lines[index];
    const pieces = splitSentences(line.text);
    if (pieces.length <= 1) return;
    const split = pieces.map((text, i) => (i === 0
      ? {
        ...line,
        text,
      }
      : {
        ...freshLine(text),
        summaryOnly: line.summaryOnly,
      }));
    onChange([...lines.slice(0, index), ...split, ...lines.slice(index + 1)]);
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="rs-paste">Paste the lines</Label>
        <Textarea
          id="rs-paste"
          value={pasteBuffer}
          onChange={e => setPasteBuffer(e.target.value)}
          placeholder="Paste the passage here, one line per row, then split it into lines below."
          rows={4}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={splitIntoLines}
          disabled={pasteBuffer.trim().length === 0}
        >
          Split into lines
        </Button>
      </div>

      {lines.length === 0
        ? (
          <p className="text-sm text-muted-foreground">
            No lines yet. Paste the passage above and split it into lines.
          </p>
        )
        : (
          <ul className="space-y-3">
            {lines.map(line => (
              <li
                key={line.id}
                className="space-y-2 rounded-md border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base">{line.text}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => splitLine(line.id)}
                      disabled={splitSentences(line.text).length <= 1}
                      aria-label="Split into sentences"
                      title="Split into one line per sentence"
                    >
                      <Scissors className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeLine(line.id)}
                      aria-label="Delete line"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={line.summaryOnly}
                    onCheckedChange={v => patchLine(line.id, {
                      summaryOnly: v === true,
                    })}
                  />
                  Summary only (not a literal translation)
                </label>
                <Textarea
                  value={line.translation ?? ""}
                  onChange={e => patchLine(line.id, {
                    translation: e.target.value,
                  })}
                  placeholder={line.summaryOnly ? "Summary of this line" : "Translation of this line"}
                  rows={2}
                  aria-label={line.summaryOnly ? "Line summary" : "Line translation"}
                />
                <div className="space-y-1.5">
                  <Label>How did the translation go?</Label>
                  <TranslationVerdictPicker
                    value={line.verdict}
                    onChange={verdict => patchLine(line.id, {
                      verdict,
                    })}
                  />
                </div>
                {line.verdict === "incorrect"
                  || line.verdict === "partial"
                  || line.correction
                  || line.note
                  ? (
                    <>
                      <Textarea
                        value={line.correction ?? ""}
                        onChange={e => patchLine(line.id, {
                          correction: e.target.value,
                        })}
                        placeholder="Reference translation"
                        rows={2}
                        aria-label="Reference translation"
                      />
                      <Textarea
                        value={line.note ?? ""}
                        onChange={e => patchLine(line.id, {
                          note: e.target.value,
                        })}
                        placeholder="Comment on the translation (optional)"
                        rows={2}
                        aria-label="Line comment"
                      />
                    </>
                  )
                  : null}
                <TermPicker
                  category="grammar"
                  label="Grammar"
                  value={line.grammarTerms ?? []}
                  onChange={(terms: SentenceTermRef[]) => patchLine(line.id, {
                    grammarTerms: terms.length > 0 ? terms : null,
                  })}
                />
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
