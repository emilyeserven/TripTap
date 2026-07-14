/** Case-insensitive substring match of `query` against any of the given fields. Empty query matches all. */
export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some(f => (f ?? "").toLowerCase().includes(q));
}

const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1"];

/** Distinct level tags, JLPT levels first (N5→N1), then any other tags alphabetically. */
export function sortLevels(levels: string[]): string[] {
  return [...new Set(levels)].sort((a, b) => {
    const ai = JLPT_ORDER.indexOf(a);
    const bi = JLPT_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}
