import type { ConstructionSlot } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { slotToken } from "@/lib/construction-blocks";
import { BlockChip, docToNote, noteToDoc, slashRange } from "@/lib/tiptap/constructionNote";

/** The live slash menu: the `/query` doc range plus its popup position and highlighted row. */
interface SlashMenu {
  from: number;
  to: number;
  query: string;
  top: number;
  left: number;
  index: number;
}

/**
 * The note field of a block construction: a one-field TipTap editor whose text can embed the
 * construction's blocks as inline chips — insert via the palette row or a `/` slash menu, move by
 * dragging, delete like a character. The value stays a plain string with `[Label]` tokens (the
 * `meaning` convention), so the wire format and old notes are untouched.
 *
 * The doc is only rebuilt from `value` when it differs from the editor's own serialization (i.e. an
 * external reset), never on keystrokes — and deliberately not when `slots` change: chips for a
 * renamed slot keep their old label and degrade to plain text, which beats clobbering the cursor.
 */
export function ConstructionNoteEditor({
  value,
  onChange,
  slots,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  slots: ConstructionSlot[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<SlashMenu | null>(null);
  const menuRef = useRef<SlashMenu | null>(null);
  menuRef.current = menu;
  const tokens = slots.map(slotToken).filter(Boolean);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const filteredTokens = (query: string) =>
    tokensRef.current.filter(t => t.toLowerCase().includes(query.toLowerCase()));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      BlockChip,
    ],
    content: noteToDoc(value, slots),
    editorProps: {
      attributes: {
        "class": "outline-none",
        "aria-label": "Construction note",
      },
      handleKeyDown: (_view, event) => {
        const open = menuRef.current;
        if (!open) return false;
        const items = filteredTokens(open.query);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (items.length === 0) return false;
          const delta = event.key === "ArrowDown" ? 1 : -1;
          setMenu({
            ...open,
            index: (open.index + delta + items.length) % items.length,
          });
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const label = items[open.index];
          if (!label) return false;
          commit(open, label);
          return true;
        }
        if (event.key === "Escape") {
          setMenu(null);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({
      editor,
    }) => {
      onChange(docToNote(editor.getJSON()));
      refreshMenu();
    },
    onSelectionUpdate: refreshMenu,
    onBlur: () => setMenu(null),
  });

  function refreshMenu() {
    const e = editor;
    if (!e || e.view.composing) {
      setMenu(null);
      return;
    }
    const range = slashRange(e.state);
    const container = containerRef.current;
    if (!range || !container || filteredTokens(range.query).length === 0) {
      setMenu(null);
      return;
    }
    const coords = e.view.coordsAtPos(range.from);
    const rect = container.getBoundingClientRect();
    setMenu(prev => ({
      ...range,
      top: coords.bottom - rect.top,
      left: coords.left - rect.left,
      index: prev && prev.query === range.query ? prev.index : 0,
    }));
  }

  function commit(open: SlashMenu, label: string) {
    editor
      ?.chain()
      .focus()
      .deleteRange({
        from: open.from,
        to: open.to,
      })
      .insertContent({
        type: "blockChip",
        attrs: {
          label,
        },
      })
      .run();
    setMenu(null);
  }

  // External resets only: skip when the incoming value is the echo of our own onChange.
  useEffect(() => {
    if (!editor) return;
    if ((value ?? "") === (docToNote(editor.getJSON()) ?? "")) return;
    editor.commands.setContent(noteToDoc(value, slots), {
      emitUpdate: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slots changes must not rebuild the doc mid-edit.
  }, [value, editor]);

  const insertChip = (label: string) =>
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "blockChip",
        attrs: {
          label,
        },
      })
      .run();

  return (
    <div className="space-y-1.5">
      {tokens.length > 0
        ? (
          <div
            className="
              flex flex-wrap items-center gap-1 text-xs text-muted-foreground
            "
          >
            <span>Insert block (or type /):</span>
            {tokens.map(token => (
              <button
                key={token}
                type="button"
                className="
                  rounded-md border bg-muted px-1.5 text-sm font-medium
                  hover:bg-accent
                "
                onClick={() => insertChip(token)}
              >
                {token}
              </button>
            ))}
          </div>
        )
        : null}
      <div
        ref={containerRef}
        className="relative"
      >
        <EditorContent
          editor={editor}
          className="
            min-h-16 rounded-md border bg-background px-3 py-2 text-sm
            focus-within:ring-2 focus-within:ring-ring
            [&_.tiptap]:outline-none
            [&_p]:my-0.5
          "
        />
        {menu
          ? (
            <div
              className="
                absolute z-10 min-w-32 rounded-md border bg-popover p-1
                shadow-md
              "
              style={{
                top: menu.top,
                left: menu.left,
              }}
            >
              {filteredTokens(menu.query).map((token, i) => (
                <button
                  key={token}
                  type="button"
                  className={`
                    block w-full rounded-sm px-2 py-1 text-left text-sm
                    ${i === menu.index ? "bg-accent text-accent-foreground" : ""}
                  `}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => commit(menu, token)}
                >
                  {token}
                </button>
              ))}
            </div>
          )
          : null}
      </div>
    </div>
  );
}
