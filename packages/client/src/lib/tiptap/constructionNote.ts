import type { ConstructionSlot } from "@sentence-bank/types";
import type { EditorState } from "@tiptap/pm/state";
import type { JSONContent } from "@tiptap/react";

import { mergeAttributes, Node } from "@tiptap/core";

import { resolveSlotToken } from "@/lib/construction-blocks";

/**
 * An inline atom chip standing for one construction block inside a note. The chip is not interactive
 * in the editor (the read view owns interactivity) — it is just a draggable, deletable label. Notes
 * stay plain strings on the wire: chips serialize to `[Label]` tokens (the `meaning` convention) via
 * {@link docToNote} / {@link noteToDoc}.
 */
export const BlockChip = Node.create({
  name: "blockChip",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: () => ({
    label: {
      default: "",
    },
  }),
  parseHTML: () => [{
    tag: "span[data-block-chip]",
    getAttrs: el => ({
      label: (el as HTMLElement).getAttribute("data-block-chip") ?? "",
    }),
  }],
  renderHTML: ({
    node, HTMLAttributes,
  }) => [
    "span",
    mergeAttributes(HTMLAttributes, {
      "data-block-chip": node.attrs.label as string,
      "class": "rounded-md border bg-muted px-1.5 text-sm font-medium select-none",
    }),
    node.attrs.label as string,
  ],
});

/**
 * Parse a stored note string into a TipTap doc: one paragraph per line, `[X]` tokens that resolve to
 * a slot (via {@link resolveSlotToken}) become blockChip nodes carrying the token text. Unmatched
 * tokens stay as plain text WITH their brackets — unlike display rendering, the editor must
 * round-trip old notes that happen to contain literal brackets without data loss.
 */
export function noteToDoc(note: string | null, slots: ConstructionSlot[]): JSONContent {
  const paragraphs = (note ?? "").split("\n").map((line) => {
    const children: JSONContent[] = [];
    const pushText = (text: string) => {
      if (text) {
        children.push({
          type: "text",
          text,
        });
      }
    };
    let last = 0;
    for (const match of line.matchAll(/\[([^\]]+)\]/g)) {
      const token = match[1] ?? "";
      if (resolveSlotToken(token, slots)) {
        pushText(line.slice(last, match.index));
        children.push({
          type: "blockChip",
          attrs: {
            label: token,
          },
        });
      }
      else {
        pushText(line.slice(last, match.index + match[0].length));
      }
      last = match.index + match[0].length;
    }
    pushText(line.slice(last));
    return {
      type: "paragraph",
      ...(children.length > 0
        ? {
          content: children,
        }
        : {}),
    };
  });
  return {
    type: "doc",
    content: paragraphs,
  };
}

/**
 * Serialize an editor doc back to the stored note string: text stays text, blockChip → `[Label]`,
 * hardBreak → "\n" (defensive — the editor disables it), paragraphs join with "\n". Empty → null.
 */
export function docToNote(doc: JSONContent): string | null {
  const lines = (doc.content ?? []).map((block) => {
    let line = "";
    for (const child of block.content ?? []) {
      if (child.type === "text") line += child.text ?? "";
      else if (child.type === "blockChip") line += `[${(child.attrs?.label as string | undefined) ?? ""}]`;
      else if (child.type === "hardBreak") line += "\n";
    }
    return line;
  });
  const note = lines.join("\n");
  return note.trim() ? note : null;
}

/** A live `/query` slash trigger before the cursor, with the doc range to replace on commit. */
export interface SlashRange {
  from: number;
  to: number;
  query: string;
}

/**
 * Detect a slash trigger in the current textblock: a `/` at the block start or after whitespace,
 * with no whitespace (or atom — the `￼` sentinel) between it and the cursor. Returns the doc
 * range covering `/query` so committing can `deleteRange` it.
 */
export function slashRange(state: EditorState): SlashRange | null {
  const {
    $from, empty,
  } = state.selection;
  if (!empty || !$from.parent.isTextblock) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const slash = before.lastIndexOf("/");
  if (slash === -1) return null;
  if (slash > 0 && !/\s/.test(before[slash - 1] ?? "")) return null;
  const query = before.slice(slash + 1);
  if (/[\s￼]/.test(query)) return null;
  const blockStart = $from.start();
  return {
    from: blockStart + slash,
    to: $from.pos,
    query,
  };
}
