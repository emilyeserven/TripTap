import type { ShadowingList } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Headphones } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/** Compact list-item for one shadowing list: name link, member count, and a snippet of notes. */
export function ShadowingListCard({
  list,
}: {
  list: ShadowingList;
}) {
  const count = list.sentenceIds.length + list.mySentenceIds.length;
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/shadowing-lists/$id"
            params={{
              id: list.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {list.name}
          </Link>
          <span
            className="
              flex shrink-0 items-center gap-1 text-sm text-muted-foreground
            "
          >
            <Headphones className="size-3.5" />
            {count}
            {" "}
            {count === 1 ? "sentence" : "sentences"}
          </span>
        </div>
        {list.notes
          ? <p className="line-clamp-2 text-sm text-muted-foreground">{list.notes}</p>
          : null}
      </CardContent>
    </Card>
  );
}
