import { marked } from "marked";
import TurndownService from "turndown";

/**
 * Bridge between the lesson-notes markdown string (how notes are stored) and the HTML TipTap
 * reads/writes. `marked` parses markdown → HTML to seed the editor; `turndown` serializes the editor's
 * HTML → markdown on save. Notes stay plain markdown end-to-end; only the editing surface is rich.
 */

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

// Turndown's default pads list markers to a 4-char prefix ("-   item"), which would rewrite every
// "- item" bullet in the user's notes on save. Use a clean single space (2-space nested indent instead).
turndown.addRule("cleanListItem", {
  filter: "li",
  replacement: (content, node, options) => {
    const body = content
      .replace(/^\n+/, "")
      .replace(/\n+$/, "\n")
      .replace(/\n/gm, "\n  ");
    const parent = node.parentNode as (Node & { nodeName: string }) | null;
    let prefix = `${options.bulletListMarker} `;
    if (parent?.nodeName === "OL") {
      const el = parent as unknown as Element;
      const start = el.getAttribute("start");
      const index = Array.prototype.indexOf.call(el.children, node);
      prefix = `${start ? Number(start) + index : index + 1}. `;
    }
    return prefix + body + (node.nextSibling && !/\n$/.test(body) ? "\n" : "");
  },
});

/** Parse a stored notes markdown string into HTML for TipTap to render. */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: false,
  });
}

/** Serialize TipTap's HTML back to a markdown string for storage. */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}
