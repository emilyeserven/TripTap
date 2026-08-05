import type { CorrectionImportKind } from "@sentence-bank/types";

import { useState } from "react";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImportCandidates, useImportCorrections } from "@/hooks/useCorrections";

const KIND_LABELS: Record<CorrectionImportKind, string> = {
  my_sentence: "My Sentences",
  writing: "Writing",
  answer_sheet: "Answer Sheets",
  reading_session: "Reading",
  practice_sentence: "Practice",
};

/**
 * Pull corrected output already living in another feature into the triage Inbox — every place the
 * app records "this was wrong, here's the fix". Candidates already imported are filtered out
 * server-side, so nothing double-imports.
 */
export function CorrectionImportDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CorrectionImportKind>("my_sentence");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const {
    data: candidates, isLoading,
  } = useImportCandidates(kind);
  const importMutation = useImportCorrections();

  const list = candidates ?? [];
  const allSelected = list.length > 0 && selected.size === list.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(list.map(c => c.ref.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function switchKind(next: CorrectionImportKind) {
    setKind(next);
    setSelected(new Set());
  }

  async function runImport() {
    const refs = list.filter(c => selected.has(c.ref.id)).map(c => c.ref);
    if (refs.length === 0) return;
    const created = await importMutation.mutateAsync({
      refs,
    });
    toast.success(`Imported ${created.length} correction${created.length === 1 ? "" : "s"}`);
    setSelected(new Set());
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSelected(new Set());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" />
          Import from…
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import existing corrections</DialogTitle>
          <DialogDescription>
            Bring corrected output you already recorded into the triage Inbox. Already-imported items
            are hidden.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={kind}
          onValueChange={v => switchKind(v as CorrectionImportKind)}
        >
          <TabsList>
            {(Object.keys(KIND_LABELS) as CorrectionImportKind[]).map(k => (
              <TabsTrigger
                key={k}
                value={k}
              >
                {KIND_LABELS[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!isLoading && list.length > 0
          ? (
            <label
              className="
                flex w-fit cursor-pointer items-center gap-2 text-sm font-medium
              "
            >
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
              Select all
            </label>
          )
          : null}

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!isLoading && list.length === 0
            ? (
              <p className="text-sm text-muted-foreground">
                Nothing left to import from {KIND_LABELS[kind]}.
              </p>
            )
            : null}
          {list.map(candidate => (
            <label
              key={candidate.ref.id}
              className="
                flex cursor-pointer items-start gap-3 rounded-md border p-3
                text-sm
                hover:bg-muted/50
              "
            >
              <Checkbox
                checked={selected.has(candidate.ref.id)}
                onCheckedChange={() => toggle(candidate.ref.id)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                {/* Show the final sentence: the fix if there is one, else the sentence as written.
                    Never surface an incorrect original alongside its correction. */}
                <span className="block font-medium">{candidate.corrected ?? candidate.original}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {candidate.label
                    ? <Badge variant="secondary">{candidate.label}</Badge>
                    : null}
                  {candidate.grammarTerms.map(term => (
                    <Badge
                      key={term.id}
                      variant="outline"
                    >
                      {term.name}
                    </Badge>
                  ))}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            onClick={runImport}
            disabled={selected.size === 0 || importMutation.isPending}
          >
            Import {selected.size > 0 ? selected.size : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
