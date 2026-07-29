import type { ChunkCard } from "@sentence-bank/types";

import { useState } from "react";

import { ChunkCardForm } from "@/components/ChunkCardForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeleteChunkCard } from "@/hooks/useRuleGroups";

/**
 * One chunk card: its front/back and format. `wrongForm` is deliberately *not* rendered — it lives on
 * the model for the log only (spec §6 inv.3). Delete lives in the edit view only.
 */
export function ChunkCardCard({
  card,
}: { card: ChunkCard }) {
  const del = useDeleteChunkCard();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <ChunkCardForm
            card={card}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await del.mutateAsync(card.id);
            }}
            disabled={del.isPending}
          >
            Delete card
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{card.chunk}</span>
          <Badge variant="secondary">
            {card.format === "cloze" ? "Cloze" : "Production"}
          </Badge>
        </div>
        <p>
          <span className="text-muted-foreground">Front: </span>
          {card.prompt}
        </p>
        <p>
          <span className="text-muted-foreground">Back: </span>
          {card.answer}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
      </CardContent>
    </Card>
  );
}
