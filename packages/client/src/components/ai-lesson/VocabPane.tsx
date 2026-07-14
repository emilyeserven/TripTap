import type { CategoryItem, VocabItem } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { AiLessonIcon } from "./icon-map";
import { VocabCard } from "./VocabCard";

import { Button } from "@/components/ui/button";

export function VocabPane({
  vocab,
  categories,
}: {
  vocab: VocabItem[];
  categories: CategoryItem[];
}) {
  const [cat, setCat] = useState("all");
  const list = useMemo(
    () => (cat === "all" ? vocab : vocab.filter(v => v.cat === cat)),
    [cat, vocab],
  );
  const catLabel = (key: string) => categories.find(c => c.key === key)?.en ?? key;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={cat === "all" ? "default" : "outline"}
          onClick={() => setCat("all")}
        >
          All
        </Button>
        {categories.map(c => (
          <Button
            key={c.key}
            size="sm"
            variant={cat === c.key ? "default" : "outline"}
            onClick={() => setCat(c.key)}
          >
            <AiLessonIcon
              name={c.icon}
              className="size-3.5"
            />
            {c.en}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Tap a card to flip it.</p>
      <div
        className="
          grid gap-3
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        {list.map(v => (
          <VocabCard
            key={v.id}
            vocab={v}
            topLabel={catLabel(v.cat)}
          />
        ))}
      </div>
    </div>
  );
}
