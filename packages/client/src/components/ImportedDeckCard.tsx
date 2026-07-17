import type { MigakuImport } from "@sentence-bank/types";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDeleteDeckCards, useDeleteMigakuImport } from "@/hooks/useMigakuImports";

/** A committed Migaku deck in the "Imported decks" list, with remove / delete-cards actions. */
export function ImportedDeckCard({
  imp,
}: { imp: MigakuImport }) {
  const remove = useDeleteMigakuImport();
  const deleteCards = useDeleteDeckCards();
  const busy = remove.isPending || deleteCards.isPending;

  const counts = [
    imp.sentencesCreated != null ? `${imp.sentencesCreated} sentences` : null,
    imp.vocabCreated != null ? `${imp.vocabCreated} vocab` : null,
    imp.skipped ? `${imp.skipped} skipped` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-medium">{imp.deckName}</p>
        <p className="text-sm text-muted-foreground">
          {imp.candidateCount}
          {" cards"}
          {counts ? ` — ${counts}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (globalThis.confirm(`Remove "${imp.deckName}" from this list? The imported cards are kept.`)) {
              remove.mutate(imp.id);
            }
          }}
        >
          Remove
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (globalThis.confirm(
              `Delete every card imported under "${imp.deckName}"? This permanently removes those sentences and vocab (and their media). This can't be undone.`,
            )) {
              deleteCards.mutate(imp.id, {
                onSuccess: r =>
                  toast.success(`Deleted ${r.sentencesDeleted} sentence(s) and ${r.vocabDeleted} vocab item(s)`),
              });
            }
          }}
        >
          Delete cards
        </Button>
      </div>
    </Card>
  );
}
