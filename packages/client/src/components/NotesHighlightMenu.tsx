import type { Lesson } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { NotebookPen, PenLine, Quote } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { useUpdateLesson } from "@/hooks/useLessons";
import { useCreateMySentence } from "@/hooks/useMySentences";
import { useCreateWritingPrompt } from "@/hooks/useWritingPrompts";
import { newId } from "@/lib/id";

interface Menu { top: number;
  left: number;
  text: string; }

/**
 * Renders a lesson's Notes (markdown) and, when the reader highlights text inside them, floats a small
 * menu at the selection offering to capture it as a Word card, a writing prompt, or a (lesson-linked)
 * sentence. Each action creates the entity seeded with the selected text; the rest is filled in later
 * on that entity's own page.
 */
export function NotesHighlightMenu({
  lesson,
}: {
  lesson: Lesson;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  const updateLesson = useUpdateLesson();
  const createWritingPrompt = useCreateWritingPrompt();
  const createMySentence = useCreateMySentence();

  // Close the menu when the pointer goes down anywhere but the menu itself (starting a new selection,
  // or clicking away). A fresh selection re-opens it on mouseup.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  function onMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    const container = containerRef.current;
    if (!text || !sel || sel.rangeCount === 0 || !container) {
      setMenu(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setMenu(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    setMenu({
      top: rect.top - cRect.top,
      left: rect.left - cRect.left,
      text,
    });
  }

  function done(message: string) {
    toast.success(message);
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  }

  function addWordCard(text: string) {
    updateLesson.mutate(
      {
        id: lesson.id,
        input: {
          wordNotes: [
            ...(lesson.wordNotes ?? []),
            {
              id: newId(),
              word: text,
              reading: null,
              meaning: null,
              notes: null,
              status: "shaky",
              flashcard: false,
            },
          ],
        },
      },
      {
        onSuccess: () => done("Added a word card"),
      },
    );
  }

  function addWritingPrompt(text: string) {
    createWritingPrompt.mutate(
      {
        text,
      },
      {
        onSuccess: () => done("Added a writing prompt"),
      },
    );
  }

  function addSentence(text: string) {
    createMySentence.mutate(
      {
        text,
        language: lesson.language,
        lessonId: lesson.id,
      },
      {
        onSuccess: () => done("Added a sentence"),
      },
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseUp={onMouseUp}
    >
      <Markdown content={lesson.notes ?? ""} />

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
              onClick={() => addWordCard(menu.text)}
            >
              <NotebookPen className="size-4" />
              Word card
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => addWritingPrompt(menu.text)}
            >
              <PenLine className="size-4" />
              Writing prompt
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => addSentence(menu.text)}
            >
              <Quote className="size-4" />
              Sentence
            </Button>
          </div>
        )
        : null}
    </div>
  );
}
