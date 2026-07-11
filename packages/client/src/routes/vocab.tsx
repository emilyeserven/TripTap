import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VocabForm } from "@/components/VocabForm";
import { useSources } from "@/hooks/useSources";
import { useDeleteVocab, useVocab } from "@/hooks/useVocab";

export const Route = createFileRoute("/vocab")({
  component: VocabPage,
});

function VocabPage() {
  const {
    data: vocab, isLoading, error,
  } = useVocab();
  const {
    data: sources,
  } = useSources();
  const deleteVocab = useDeleteVocab();
  const [dialogOpen, setDialogOpen] = useState(false);

  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vocab</h1>
          <p className="text-sm text-muted-foreground">Your standalone vocabulary bank.</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New vocab
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>New vocab</DialogTitle>
            </DialogHeader>
            <VocabForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!isLoading && vocab && vocab.length === 0
        ? <p className="text-muted-foreground">No vocab yet.</p>
        : null}

      <div
        className="
          grid gap-4
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        {(vocab ?? []).map(v => (
          <Card key={v.id}>
            <CardContent className="space-y-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-semibold">{v.term}</p>
                <button
                  type="button"
                  onClick={() => deleteVocab.mutate(v.id)}
                  className="
                    text-xs text-red-600
                    hover:underline
                  "
                >
                  Delete
                </button>
              </div>
              {v.reading ? <p className="text-sm text-muted-foreground">{v.reading}</p> : null}
              {v.meaning ? <p className="text-sm">{v.meaning}</p> : null}
              <p className="text-xs text-muted-foreground">
                {[sourceName(v.sourceId), v.page ? `p. ${v.page}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
