import type { Insertion } from "@/lib/sentenceMarks";
import type { SentenceMark } from "@sentence-bank/types";
import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import { MARK_CORRECT_CLASS, MARK_INCORRECT_CLASS } from "@/components/MarkedText";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addMark,
  buildCorrection,

  removeMark,
} from "@/lib/sentenceMarks";
import { cn } from "@/lib/utils";

export interface SentenceCorrectionResult {
  correction: string;
  marks: SentenceMark[];
  reasoning: string | null;
}

/**
 * Inline correction editor for one un-reviewed sentence. The immutable original is shown; the learner
 * **selects** a span to mark it correct/incorrect and **clicks** a spot to type an insertion — the
 * corrected sentence is the live *derived* result (incorrect spans dropped, insertions spliced in).
 * Once anything is edited, a reasoning field + Save appear; Save commits `{ correction, marks, reasoning }`
 * together via `onSave`.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [marks, setMarks] = useState<SentenceMark[]>([]);
  const [insertions, setInsertions] = useState<Insertion[]>([]);
  const [reasoning, setReasoning] = useState(initialReasoning ?? "");
  const [menu, setMenu] = useState<{ top: number;
    left: number;
    start: number;
    end: number; } | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [insertDraft, setInsertDraft] = useState("");

  const edited = marks.length > 0 || insertions.length > 0;
  const correction = buildCorrection(text, marks, insertions);

  // Close the mark menu on any pointer-down outside it.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  /** Map a DOM (node, offset) to a character offset into the original `text`, via the run span's data-start. */
  function offsetFromPoint(node: Node | null, offset: number): number | null {
    let el: Element | null = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    while (el && el !== containerRef.current) {
      if (el instanceof HTMLElement && el.dataset.start != null) {
        return Number(el.dataset.start) + offset;
      }
      el = el.parentElement;
    }
    return null;
  }

  function onMouseUp() {
    const sel = window.getSelection();
    const container = containerRef.current;
    if (!sel || !container) return;

    if (sel.isCollapsed) {
      const p = offsetFromPoint(sel.focusNode, sel.focusOffset);
      if (p == null) return;
      const hit = marks.find(m => p >= m.start && p < m.end);
      if (hit) {
        setMarks(removeMark(marks, hit.start));
      }
      else {
        setInsertAt(p);
        setInsertDraft("");
      }
      return;
    }

    const a = offsetFromPoint(sel.anchorNode, sel.anchorOffset);
    const b = offsetFromPoint(sel.focusNode, sel.focusOffset);
    if (a == null || b == null || a === b) {
      setMenu(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    setMenu({
      top: rect.top - cRect.top,
      left: rect.left - cRect.left,
      start: Math.min(a, b),
      end: Math.max(a, b),
    });
  }

  function applyMark(correct: boolean) {
    if (!menu) return;
    setMarks(addMark(marks, {
      start: menu.start,
      end: menu.end,
      correct,
    }));
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  function commitInsertion() {
    if (insertAt != null && insertDraft.length > 0) {
      setInsertions([...insertions, {
        at: insertAt,
        text: insertDraft,
      }]);
    }
    setInsertAt(null);
    setInsertDraft("");
  }

  // Split the original into segments at every mark boundary / insertion offset, interleaving insertion
  // chips and the active insertion input so the whole thing renders as a flat run of inline elements.
  const points = Array.from(new Set([
    0,
    text.length,
    ...marks.flatMap(m => [m.start, m.end]),
    ...insertions.map(i => i.at),
    ...(insertAt != null ? [insertAt] : []),
  ]))
    .filter(p => p >= 0 && p <= text.length)
    .sort((x, y) => x - y);

  const nodes: ReactNode[] = [];
  points.forEach((p, idx) => {
    insertions.forEach((ins, k) => {
      if (ins.at !== p) return;
      nodes.push(
        <button
          key={`ins-${k}`}
          type="button"
          title="Click to remove"
          onClick={() => setInsertions(insertions.filter((_, i) => i !== k))}
          className={cn(MARK_CORRECT_CLASS, "cursor-pointer px-0.5")}
        >
          {ins.text}
        </button>,
      );
    });
    if (insertAt === p) {
      nodes.push(
        <input
          key="ins-input"
          autoFocus
          value={insertDraft}
          onChange={e => setInsertDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitInsertion();
            }
            if (e.key === "Escape") {
              setInsertAt(null);
              setInsertDraft("");
            }
          }}
          onBlur={commitInsertion}
          placeholder="type…"
          className="
            mx-0.5 inline-block w-24 rounded-sm border bg-background px-1
            text-base
          "
        />,
      );
    }
    const next = points[idx + 1];
    if (next != null && next > p) {
      const m = marks.find(mm => mm.start <= p && mm.end >= next);
      nodes.push(
        <span
          key={`seg-${p}`}
          data-start={p}
          className={cn(
            m && "cursor-pointer",
            m?.correct === true ? MARK_CORRECT_CLASS : m?.correct === false ? MARK_INCORRECT_CLASS : undefined,
          )}
        >
          {text.slice(p, next)}
        </span>,
      );
    }
  });

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative text-base/relaxed"
        onMouseUp={onMouseUp}
      >
        {nodes}
        {menu
          ? (
            <div
              ref={menuRef}
              className="
                absolute z-20 -mt-1 flex -translate-y-full items-center gap-1
                rounded-md border bg-popover p-1 shadow-md
              "
              style={{
                top: menu.top,
                left: menu.left,
              }}
            >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="
                  text-emerald-700
                  dark:text-emerald-400
                "
                onClick={() => applyMark(true)}
              >
                Correct
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => applyMark(false)}
              >
                Incorrect
              </Button>
            </div>
          )
          : null}
      </div>

      {edited
        ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Corrected</span>
              <p className="text-base">{correction || (
                <span
                  className="text-muted-foreground italic"
                >(empty)
                </span>
              )}
              </p>
            </div>
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
                correction,
                marks,
                reasoning: reasoning.trim() || null,
              })}
            >
              {saveLabel}
            </Button>
          </div>
        )
        : (
          <p className="text-xs text-muted-foreground">
            Select text to mark it correct / incorrect · click a mark to clear · click a spot to type a fix.
          </p>
        )}
    </div>
  );
}
