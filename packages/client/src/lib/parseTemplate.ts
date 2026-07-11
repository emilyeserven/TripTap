import type { ParseBoundary } from "@sentence-bank/types";

/** One parsed record: the extracted `{{field}}` values plus whether its required field is present. */
export interface ParsedItem {
  fields: Record<string, string>;
  valid: boolean;
}

export interface ParseResult {
  items: ParsedItem[];
  validCount: number;
  invalidCount: number;
}

export interface ParseOptions {
  boundary: ParseBoundary;
  ignoreBlankLines: boolean;
  /** Field that must be non-empty for an item to be valid (e.g. "text" or "term"). */
  requiredField: string;
}

const TAG = /\{\{(\w+)\}\}/g;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(s: string): string {
  return s.replace(/\r\n?/g, "\n");
}

/** Extract field values from one value line using one template line's tags + literals. */
function parseLine(templateLine: string, valueLine: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const tags: string[] = [];
  const literals: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(templateLine)) !== null) {
    literals.push(templateLine.slice(lastIndex, m.index));
    tags.push(m[1]);
    lastIndex = m.index + m[0].length;
  }
  literals.push(templateLine.slice(lastIndex));
  if (tags.length === 0) return fields;

  let pattern = "^";
  for (let i = 0; i < tags.length; i++) {
    pattern += escapeRegex(literals[i]);
    // Last capture is greedy so a trailing field absorbs the remainder of the line.
    pattern += i === tags.length - 1 ? "(.*)" : "(.*?)";
  }
  pattern += `${escapeRegex(literals[literals.length - 1])}$`;

  const match = valueLine.match(new RegExp(pattern));
  if (match) {
    tags.forEach((tag, i) => {
      fields[tag] = (match[i + 1] ?? "").trim();
    });
  }
  else if (tags.length === 1) {
    // Literal delimiters didn't match — fall back to the whole line for a single-tag line.
    fields[tags[0]] = valueLine.trim();
  }
  return fields;
}

function parseChunk(templateLines: string[], chunkLines: string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  templateLines.forEach((templateLine, i) => {
    const parsed = parseLine(templateLine, chunkLines[i] ?? "");
    for (const [key, value] of Object.entries(parsed)) {
      // Later lines only overwrite when they contribute a non-empty value.
      if (value || !(key in fields)) fields[key] = value;
    }
  });
  return fields;
}

/**
 * Split `text` into items using a `{{tag}}` template and turn each into a field record. Items are
 * delimited either by the template's line count ("fixed") or by blank lines ("blank"). An item is
 * `valid` when its `requiredField` is non-empty.
 */
export function parseTemplate(text: string, template: string, opts: ParseOptions): ParseResult {
  const templateLines = normalize(template).replace(/\n+$/, "").split("\n");
  const perItem = Math.max(1, templateLines.length);

  let chunks: string[][];
  if (opts.boundary === "blank") {
    chunks = normalize(text)
      .split(/\n\s*\n/)
      .map((block) => {
        const lines = block.split("\n");
        return opts.ignoreBlankLines ? lines.filter(l => l.trim() !== "") : lines;
      })
      .filter(lines => lines.some(l => l.trim() !== ""));
  }
  else {
    let lines = normalize(text).split("\n");
    if (opts.ignoreBlankLines) lines = lines.filter(l => l.trim() !== "");
    chunks = [];
    for (let i = 0; i < lines.length; i += perItem) {
      const chunk = lines.slice(i, i + perItem);
      if (chunk.some(l => l.trim() !== "")) chunks.push(chunk);
    }
  }

  const items: ParsedItem[] = chunks.map((chunk) => {
    const fields = parseChunk(templateLines, chunk);
    return {
      fields,
      valid: Boolean(fields[opts.requiredField]),
    };
  });

  const validCount = items.filter(i => i.valid).length;
  return {
    items,
    validCount,
    invalidCount: items.length - validCount,
  };
}
