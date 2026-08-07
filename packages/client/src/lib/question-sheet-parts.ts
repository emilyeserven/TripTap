/**
 * Label generation for question-sheet parts. Kept separate from the form component so the helpers can
 * be exported and unit-tested without tripping the react-refresh "only export components" rule.
 */

/** How a quick-added part is labelled: letters "(a)", numbers "(1)", or roman "(i)". */
export type PartLabelStyle = "letter" | "number" | "roman";

let idCounter = 0;

/** Client-side unique id for questions/parts/rows (unique within one sheet is enough). */
export function newSheetItemId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** Convert a 1-based number to a lowercase Roman numeral (1 → "i", 4 → "iv", 9 → "ix"). */
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let remaining = n;
  let out = "";
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      out += symbol;
      remaining -= value;
    }
  }
  return out;
}

/** Convert a 0-based index to a spreadsheet-style lowercase letter sequence (0 → "a", 26 → "aa"). */
export function toLetters(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** Build a parenthesised part label for a 0-based `index` in the chosen `style` — e.g. "(c)", "(3)", "(iii)". */
export function partLabel(style: PartLabelStyle, index: number): string {
  switch (style) {
    case "number":
      return `(${index + 1})`;
    case "roman":
      return `(${toRoman(index + 1)})`;
    case "letter":
    default:
      return `(${toLetters(index)})`;
  }
}

/**
 * How a main question's prefilled label reads — plain (un-parenthesised), unlike {@link partLabel}:
 * decimal "1, 2, 3", upper/lower letters "A, B, C" / "a, b, c", upper/lower roman "I, II, III" /
 * "i, ii, iii". Used to seed question prompts in bulk (worksheets often number sections this way).
 */
export type QuestionLabelStyle
  = | "decimal"
    | "upper-alpha"
    | "lower-alpha"
    | "upper-roman"
    | "lower-roman";

/** Build a plain main-question label for a 0-based `index` in the chosen `style` — e.g. "A", "iii", "3". */
export function questionLabel(style: QuestionLabelStyle, index: number): string {
  switch (style) {
    case "upper-alpha":
      return toLetters(index).toUpperCase();
    case "lower-alpha":
      return toLetters(index);
    case "upper-roman":
      return toRoman(index + 1).toUpperCase();
    case "lower-roman":
      return toRoman(index + 1);
    case "decimal":
    default:
      return String(index + 1);
  }
}

/** Cap on how many labels a single range expansion produces, matching the bulk-add caps elsewhere. */
const MAX_RANGE = 50;

/**
 * Expand an inclusive label range into its members: "a-e" → ["a","b","c","d","e"], "A-E" → uppercase,
 * "1-5" → ["1","2","3","4","5"]. Accepts a hyphen or en-dash with optional surrounding spaces. Returns
 * `null` when the input isn't a single-letter or all-numeric range, the endpoints mix kinds or case,
 * run backwards, or would exceed {@link MAX_RANGE} — so callers can disable the action until it's valid.
 */
export function expandLabelRange(input: string): string[] | null {
  const match = input.trim().match(/^([A-Za-z]|\d+)\s*[-–]\s*([A-Za-z]|\d+)$/);
  if (!match) return null;
  const [, a, b] = match;

  if (/^[A-Za-z]$/.test(a) && /^[A-Za-z]$/.test(b)) {
    const upper = a === a.toUpperCase();
    // Both endpoints must share a case, so the output case is unambiguous.
    if ((b === b.toUpperCase()) !== upper) return null;
    const start = a.toLowerCase().charCodeAt(0);
    const end = b.toLowerCase().charCodeAt(0);
    if (end < start || end - start + 1 > MAX_RANGE) return null;
    const out: string[] = [];
    for (let code = start; code <= end; code += 1) {
      const ch = String.fromCharCode(code);
      out.push(upper ? ch.toUpperCase() : ch);
    }
    return out;
  }

  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const start = Number(a);
    const end = Number(b);
    if (end < start || end - start + 1 > MAX_RANGE) return null;
    const out: string[] = [];
    for (let n = start; n <= end; n += 1) out.push(String(n));
    return out;
  }

  return null; // one letter, one number — not a range
}
