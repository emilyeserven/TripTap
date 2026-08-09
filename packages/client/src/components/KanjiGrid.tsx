import type { KanjiSummary } from "@sentence-bank/types";

import { KanjiCard } from "./KanjiCard";

/** The kanji grid, or an empty state. Purely presentational — filtering happens server-side. */
export function KanjiGrid({
  kanji,
}: {
  kanji: KanjiSummary[];
}) {
  if (kanji.length === 0) {
    return (
      <p className="text-muted-foreground">
        No kanji match these filters yet. Add sentences or vocabulary and they’ll show up here.
      </p>
    );
  }

  return (
    <div
      className="
        grid grid-cols-4 gap-2
        sm:grid-cols-6
        md:grid-cols-8
        lg:grid-cols-10
      "
    >
      {kanji.map(k => (
        <KanjiCard
          key={k.char}
          kanji={k}
        />
      ))}
    </div>
  );
}
