import type { HandwritingStroke } from "@sentence-bank/types";

import { useCallback, useEffect, useRef, useState } from "react";

import { Eraser, Loader2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRecognizeHandwriting } from "@/hooks/useHandwriting";
import { appendPoint, drawStrokes, emptyStroke, hasPoints } from "@/lib/handwriting";

/** Drawing area height in CSS pixels — tall enough to draw a dense kanji with a fingertip. */
const PAD_HEIGHT = 224;

/**
 * How long after the last stroke ends before we ask the recognizer. Long enough that the pen lifts
 * between strokes of one character don't each cost a request, short enough that candidates feel live:
 * a twelve-stroke kanji typically costs one or two round trips, not twelve.
 */
const RECOGNIZE_DELAY_MS = 600;

/**
 * A draw-a-character pad for the dictionary lookup. The learner draws a character they can see but
 * can't type; the strokes go to the middleware recognizer and come back as ranked candidates.
 * Choosing one hands the character to the caller and clears the pad so the next character of the word
 * can be drawn straight away.
 */
export function HandwritingPad({
  onPick,
}: { onPick: (char: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<HandwritingStroke[]>([]);
  const drawing = useRef(false);
  const recognize = useRecognizeHandwriting();
  // Held in a ref so starting a new stroke can cancel a pending recognition without a re-render.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    mutate,
  } = recognize;

  /** Ink colour follows the theme's foreground token so drawings stay legible in dark mode. */
  const inkColor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return "#000";
    return getComputedStyle(canvas).color || "#000";
  }, []);

  // Repaint whenever the retained strokes change — undo and clear both just shrink the array.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    // Match the backing store to the device pixel ratio so strokes aren't blurry on a phone, while
    // every coordinate we capture and send stays in CSS pixels.
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(PAD_HEIGHT * dpr);

    const ctx = canvas.getContext?.("2d") ?? null;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStrokes(ctx, strokes, width, PAD_HEIGHT, inkColor());
  }, [strokes, inkColor]);

  // Don't leave a recognition queued behind a pad that has already been unmounted or hidden.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const runRecognize = useCallback((next: HandwritingStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas || next.length === 0) return;
    mutate({
      width: canvas.clientWidth,
      height: PAD_HEIGHT,
      strokes: next,
    });
  }, [mutate]);

  const scheduleRecognize = useCallback((next: HandwritingStroke[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runRecognize(next), RECOGNIZE_DELAY_MS);
  }, [runRecognize]);

  const pointAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    // A new stroke invalidates any queued recognition of the previous ones.
    if (timer.current) clearTimeout(timer.current);
    const {
      x, y,
    } = pointAt(e);
    setStrokes(prev => [...prev, appendPoint(emptyStroke(), x, y)]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const {
      x, y,
    } = pointAt(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = appendPoint(next[next.length - 1], x, y);
      return next;
    });
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setStrokes((prev) => {
      // Drop a stray tap that produced no ink, then recognize what's actually on the pad.
      const next = prev.filter(hasPoints);
      scheduleRecognize(next);
      return next;
    });
  };

  const undo = () => {
    if (timer.current) clearTimeout(timer.current);
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      if (next.length > 0) scheduleRecognize(next);
      else recognize.reset();
      return next;
    });
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    setStrokes([]);
    recognize.reset();
  };

  const candidates = recognize.data ?? [];

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Drawing area — draw a character here"
        style={{
          height: PAD_HEIGHT,
        }}
        className="
          w-full touch-none rounded-md border border-dashed bg-background
          text-foreground
        "
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={strokes.length === 0}
          aria-label="Undo the last stroke"
        >
          <Undo2 className="size-4" />
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={strokes.length === 0}
          aria-label="Clear the drawing"
        >
          <Eraser className="size-4" />
          Clear
        </Button>
        {recognize.isPending
          ? <Loader2 className="size-4 animate-spin text-muted-foreground" />
          : null}
      </div>

      {recognize.isError
        ? (
          <p className="text-sm text-destructive">
            {recognize.error instanceof Error ? recognize.error.message : "Recognition failed."}
          </p>
        )
        : null}

      {recognize.isSuccess && candidates.length === 0
        ? <p className="text-sm text-muted-foreground">No matches — try redrawing.</p>
        : null}

      {candidates.length > 0
        ? (
          <div className="flex flex-wrap gap-1">
            {candidates.map(char => (
              <button
                key={char}
                type="button"
                className="
                  min-w-10 rounded-md border px-2 py-1 text-lg
                  hover:bg-accent
                "
                aria-label={`Insert ${char}`}
                onClick={() => {
                  onPick(char);
                  clear();
                }}
              >
                {char}
              </button>
            ))}
          </div>
        )
        : null}

      {strokes.length === 0 && !recognize.isSuccess
        ? (
          <p className="text-xs text-muted-foreground">
            Draw one character at a time, then tap a match to add it to the search.
          </p>
        )
        : null}
    </div>
  );
}
