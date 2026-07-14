import type { CultureItem } from "@sentence-bank/types";

import { CultureCard } from "./CultureCard";

export function CulturePane({
  culture,
}: { culture: CultureItem[] }) {
  return (
    <div
      className="
        grid gap-4
        sm:grid-cols-2
      "
    >
      {culture.map(c => (
        <CultureCard
          key={c.id}
          culture={c}
        />
      ))}
    </div>
  );
}
