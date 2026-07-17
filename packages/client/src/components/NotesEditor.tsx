import type { HighlightDraft } from "@/components/NotesActionDialog";
import type { HighlightAction, HighlightMenuState } from "@/components/NotesHighlightMenu";
import type { Lesson } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";

import { NotesActionDialog } from "@/components/NotesActionDialog";
import { NotesHighlightMenu } from "@/components/NotesHighlightMenu";
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
  const [menu, setMenu] = useState<HighlightMenuState | null>(null);

  // The details dialog opened from a highlight action, pre-filled with the captured selection.
  const [pending, setPending] = useState<{ action: HighlightAction;
    text: string; } | null>(null);

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

  function submit(draft: HighlightDraft) {
    const text = draft.text.trim();
    if (!text || !pending) return;
    if (pending.action === "word") {
      if (!lesson) return;
      updateLesson.mutate(
        {
          id: lesson.id,
          input: {
            wordNotes: [
              ...(lesson.wordNotes ?? []),
              {
                id: newId(),
                word: text,
                reading: draft.reading.trim() || null,
                meaning: draft.meaning.trim() || null,
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
    else if (pending.action === "prompt") {
      createWritingPrompt.mutate(
        {
          text,
          textEn: draft.en.trim() || null,
        },
        {
          onSuccess: () => done("Added a writing prompt"),
        },
      );
    }
    else if (lesson) {
      createMySentence.mutate(
        {
          text,
          translation: draft.translation.trim() || null,
          language: lesson.language,
          lessonId: lesson.id,
        },
        {
          onSuccess: () => done("Added a sentence"),
        },
      );
    }
  }

  const busy = updateLesson.isPending || createWritingPrompt.isPending || createMySentence.isPending;

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
          <NotesHighlightMenu
            menu={menu}
            onAction={(action, text) => {
              setPending({
                action,
                text,
              });
              setMenu(null);
            }}
            onClose={() => setMenu(null)}
          />
        )
        : null}

      {pending
        ? (
          <NotesActionDialog
            key={`${pending.action}:${pending.text}`}
            action={pending.action}
            initialText={pending.text}
            busy={busy}
            onSubmit={submit}
            onClose={() => setPending(null)}
          />
        )
        : null}
    </div>
  );
}
