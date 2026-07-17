import type { ReadingLine } from "@sentence-bank/types";

import { useState } from "react";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newId } from "@/lib/id";

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
      .map((text): ReadingLine => ({
        id: newId(),
        text,
        translation: null,
        summaryOnly: false,
        correction: null,
        needsCorrection: false,
      }));
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
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={line.needsCorrection}
                    onCheckedChange={v => patchLine(line.id, {
                      needsCorrection: v === true,
                    })}
                  />
                  Needs correction
                </label>
                {line.needsCorrection && (
                  <Textarea
                    value={line.correction ?? ""}
                    onChange={e => patchLine(line.id, {
                      correction: e.target.value,
                    })}
                    placeholder="The corrected translation"
                    rows={2}
                    aria-label="Line correction"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
