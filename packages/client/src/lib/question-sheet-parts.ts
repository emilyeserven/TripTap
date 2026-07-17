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
