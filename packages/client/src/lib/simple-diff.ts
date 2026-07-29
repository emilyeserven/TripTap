/**
 * A minimal character-level diff for the rewrite-blind comparison. Japanese has no word spaces, so a
 * char-level LCS is the natural granularity; sentences here are short, so the O(n·m) table is fine.
 * Returns segments tagged `same` / `added` (in `b` only) / `removed` (in `a` only).
 */

export type DiffType = "same" | "added" | "removed";

export interface DiffSegment {
  value: string;
  type: DiffType;
}

/**
 * Diff `a` → `b` at the character level. `removed` marks characters only in `a` (the fresh attempt),
 * `added` marks characters only in `b` (the previous corrected version).
 */
export function diffChars(a: string, b: string): DiffSegment[] {
  const n = a.length;
  const m = b.length;
  // LCS length table.
  const lcs: number[][] = Array.from({
    length: n + 1,
  }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: DiffSegment[] = [];
  const push = (value: string, type: DiffType) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.value += value;
    else out.push({
      value,
      type,
    });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(a[i], "same");
      i++;
      j++;
    }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push(a[i], "removed");
      i++;
    }
    else {
      push(b[j], "added");
      j++;
    }
  }
  while (i < n) push(a[i++], "removed");
  while (j < m) push(b[j++], "added");
  return out;
}
