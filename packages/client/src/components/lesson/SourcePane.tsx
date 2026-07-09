import type { SourceSentenceItem } from "@sentence-bank/types";

import { SourceCard } from "./SourceCard";

export function SourcePane({
  source,
}: { source: SourceSentenceItem[] }) {
  return (
    <div className="space-y-4">
      {source.map(s => (
        <SourceCard
          key={s.id}
          sentence={s}
        />
      ))}
    </div>
  );
}
