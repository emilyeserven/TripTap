import type { CorrectionLogEntry } from "@sentence-bank/types";

import { useState } from "react";

import { ChunkCardForm } from "@/components/ChunkCardForm";
import { Button } from "@/components/ui/button";

/**
 * One collocation log entry with a "make a chunk card" affordance (spec §2, §7). Collocations are the
 * scarcest, most valuable bucket, so carding one is one click away; the form seeds the chunk from the
 * fix and the wrong-form (log-only) from the original.
 */
export function CollocationCardBuilder({
  entry,
}: { entry: CorrectionLogEntry }) {
  const [building, setBuilding] = useState(false);

  return (
    <li className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          <span className="line-through decoration-destructive/60">{entry.original}</span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span className="font-medium">{entry.corrected}</span>
        </span>
        {building
          ? null
          : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBuilding(true)}
            >
              Make a chunk card
            </Button>
          )}
      </div>
      {building
        ? (
          <div className="rounded-md border p-3">
            <ChunkCardForm
              batchId={entry.batchId}
              correctionId={entry.correctionId}
              defaultChunk={entry.corrected}
              defaultWrongForm={entry.original}
              onSaved={() => setBuilding(false)}
              onCancel={() => setBuilding(false)}
            />
          </div>
        )
        : null}
    </li>
  );
}
