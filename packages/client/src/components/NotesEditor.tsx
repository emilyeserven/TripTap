import type { Lesson } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { NotebookPen, PenLine, Quote } from "lucide-react";
import { toast } from "sonner";

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
import { useUpdateLesson } from "@/hooks/useLessons";
import { useCreateMySentence } from "@/hooks/useMySentences";
import { useCreateWritingPrompt } from "@/hooks/useWritingPrompts";
import { newId } from "@/lib/id";
import { htmlToMarkdown, markdownToHtml } from "@/lib/notesMarkdown";

/** Element styling for the rendered notes — mirrors the hand-rolled styles in {@link Markdown}. */
const NOTES_PROSE = `
  text-sm
  [&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold
  [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold
  [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold
  [&_p]:my-1.5 [&_p]:leading-relaxed
  [&_ul]:my-1.5 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-0.5
  [&_ol]:my-1.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-0.5
  [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
  [&_strong]:font-semibold [&_em]:italic
  [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono
  [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground
  [&_.tiptap]:outline-none
`;

interface Menu { top: number;
  left: number;
  text: string; }

/** Which entity a highlight action creates. */
type HighlightAction = "word" | "prompt" | "sentence";

/**
 * The lesson-notes surface, rendered with TipTap so the same rich view works read-only (lesson view) and
 * editable (lesson form). Notes are stored as markdown — {@link markdownToHtml} seeds the editor and
 * {@link htmlToMarkdown} serializes edits back on change. Highlighting text (in either mode) floats a menu
 * to capture the selection as a Word card, a writing prompt, or a lesson-linked sentence; clicking an
 * action opens a small dialog pre-filled with the selection so a few details can be added before the thing
 * is created. The menu needs a saved lesson to attach to, so it's disabled when `lesson` is null (e.g. the
 * new-lesson form).
 */
export function NotesEditor({
  notesMarkdown,
  editable,
  onChange,
  lesson,
}: {
  notesMarkdown: string;
  editable: boolean;
  onChange?: (markdown: string) => void;
  lesson: Lesson | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  // The details dialog opened from a highlight action, pre-filled with the captured selection.
  const [pending, setPending] = useState<{ action: HighlightAction;
    text: string; } | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftReading, setDraftReading] = useState("");
  const [draftMeaning, setDraftMeaning] = useState("");
  const [draftEn, setDraftEn] = useState("");
  const [draftTranslation, setDraftTranslation] = useState("");

  const updateLesson = useUpdateLesson();
  const createWritingPrompt = useCreateWritingPrompt();
  const createMySentence = useCreateMySentence();

  const editor = useEditor({
    extensions: [StarterKit],
    editable,
    content: markdownToHtml(notesMarkdown),
    editorProps: {
      attributes: {
        class: "outline-none",
      },
    },
    onUpdate: ({
      editor,
    }) => onChange?.(htmlToMarkdown(editor.getHTML())),
  });

  // Close the menu when the pointer goes down anywhere but the menu itself.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  // Read the DOM selection on mouseup — works in both read-only and editable editors (ProseMirror's own
  // selection state isn't updated in read-only mode, so we can't rely on it).
  function onMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    const container = containerRef.current;
    if (!lesson || !text || !sel || sel.rangeCount === 0 || !container) {
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
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }

  // Open the details dialog for an action, seeded with the captured selection.
  function openAction(action: HighlightAction, text: string) {
    setPending({
      action,
      text,
    });
    setDraftText(text);
    setDraftReading("");
    setDraftMeaning("");
    setDraftEn("");
    setDraftTranslation("");
    setMenu(null);
  }

  function submitWordCard() {
    if (!lesson) return;
    const word = draftText.trim();
    if (!word) return;
    updateLesson.mutate(
      {
        id: lesson.id,
        input: {
          wordNotes: [
            ...(lesson.wordNotes ?? []),
            {
              id: newId(),
              word,
              reading: draftReading.trim() || null,
              meaning: draftMeaning.trim() || null,
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

  function submitWritingPrompt() {
    const text = draftText.trim();
    if (!text) return;
    createWritingPrompt.mutate(
      {
        text,
        textEn: draftEn.trim() || null,
      },
      {
        onSuccess: () => done("Added a writing prompt"),
      },
    );
  }

  function submitSentence() {
    if (!lesson) return;
    const text = draftText.trim();
    if (!text) return;
    createMySentence.mutate(
      {
        text,
        translation: draftTranslation.trim() || null,
        language: lesson.language,
        lessonId: lesson.id,
      },
      {
        onSuccess: () => done("Added a sentence"),
      },
    );
  }

  function submit() {
    if (pending?.action === "word") submitWordCard();
    else if (pending?.action === "prompt") submitWritingPrompt();
    else if (pending?.action === "sentence") submitSentence();
  }

  const busy = updateLesson.isPending || createWritingPrompt.isPending || createMySentence.isPending;
  const dialogTitle = pending?.action === "word"
    ? "Add a word card"
    : pending?.action === "prompt"
      ? "Add a writing prompt"
      : "Add a sentence";

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseUp={onMouseUp}
    >
      <EditorContent
        editor={editor}
        className={editable
          ? `
            ${NOTES_PROSE}
            rounded-md border bg-background px-3 py-2
            focus-within:ring-2 focus-within:ring-ring
          `
          : NOTES_PROSE}
      />

      {menu
        ? (
          <div
            ref={menuRef}
            onMouseDown={e => e.preventDefault()}
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
              onClick={() => openAction("word", menu.text)}
            >
              <NotebookPen className="size-4" />
              Word card
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => openAction("prompt", menu.text)}
            >
              <PenLine className="size-4" />
              Writing prompt
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => openAction("sentence", menu.text)}
            >
              <Quote className="size-4" />
              Sentence
            </Button>
          </div>
        )
        : null}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          {pending?.action === "word"
            ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Word</Label>
                  <Input
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Reading</Label>
                  <Input
                    value={draftReading}
                    onChange={e => setDraftReading(e.target.value)}
                    placeholder="Kana reading (optional)…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Meaning</Label>
                  <Input
                    value={draftMeaning}
                    onChange={e => setDraftMeaning(e.target.value)}
                    placeholder="Meaning (optional)…"
                  />
                </div>
              </div>
            )
            : null}

          {pending?.action === "prompt"
            ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Japanese</Label>
                  <Textarea
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">English</Label>
                  <Textarea
                    value={draftEn}
                    onChange={e => setDraftEn(e.target.value)}
                    placeholder="English version (optional)…"
                    rows={3}
                  />
                </div>
              </div>
            )
            : null}

          {pending?.action === "sentence"
            ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Sentence</Label>
                  <Textarea
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Translation</Label>
                  <Textarea
                    value={draftTranslation}
                    onChange={e => setDraftTranslation(e.target.value)}
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
              onClick={submit}
              disabled={!draftText.trim() || busy}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
