import { useEffect, useRef } from "react";

import { NotebookPen, PenLine, Quote } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Which entity a notes-highlight action creates. */
export type HighlightAction = "word" | "prompt" | "sentence";

/** The floating selection menu's position (relative to the notes container) and captured text. */
export interface HighlightMenuState {
  top: number;
  left: number;
  text: string;
}

/**
 * The floating menu over a notes text selection: capture it as a Word card, a writing prompt, or a
 * lesson-linked sentence. Closes itself on any pointer-down outside the menu.
 */
export function NotesHighlightMenu({
  menu,
  onAction,
  onClose,
}: {
  menu: HighlightMenuState;
  onAction: (action: HighlightAction, text: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when the pointer goes down anywhere but the menu itself.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      onMouseDown={e => e.preventDefault()}
      className="
        absolute z-20 -mt-1 flex -translate-y-full items-center gap-1 rounded-md
        border bg-popover p-1 shadow-md
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
        onClick={() => onAction("word", menu.text)}
      >
        <NotebookPen className="size-4" />
        Word card
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onAction("prompt", menu.text)}
      >
        <PenLine className="size-4" />
        Writing prompt
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onAction("sentence", menu.text)}
      >
        <Quote className="size-4" />
        Sentence
      </Button>
    </div>
  );
}
