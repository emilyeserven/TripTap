import type { CreateSentenceInput, ExampleSentence } from "@sentence-bank/types";

import { useState } from "react";

import { Download, Search } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { BlurReveal } from "@/components/BlurReveal";
import { SentenceText } from "@/components/SentenceText";
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
import { Input } from "@/components/ui/input";
import { useCreateSentencesMany } from "@/hooks/useSentences";
import { useExampleSentences } from "@/hooks/useTatoeba";

/** Toggle a value's membership in a Set (immutably). */
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Build a bank sentence from a Tatoeba result. The CC-BY 2.0 FR licence requires attribution, so the
 * source sentence id, owner, and licence are stamped into the sentence's notes and a `tatoeba` tag is
 * added so imported rows stay identifiable.
 */
function toCreateInput(example: ExampleSentence): CreateSentenceInput {
  const credit = example.owner ? `by ${example.owner}` : "unknown author";
  return {
    text: example.text,
    translation: example.translation,
    language: "Japanese",
    tags: "tatoeba",
    notes: `From Tatoeba #${example.id} (${credit}) · ${example.license}`,
  };
}

/**
 * Search Tatoeba for real Japanese example sentences and import the chosen ones straight into the
 * bank ("Sentences"). Unlike {@link TatoebaExamplePicker} — a read-only reference on drill mistakes —
 * this copies sentences into the learner's own bank, so each import keeps a Tatoeba attribution
 * (sentence id + author + licence) in its notes to satisfy CC-BY 2.0 FR.
 */
export function TatoebaImportDialog({
  open: controlledOpen,
  onOpenChange,
}: {
  /** Control the dialog externally (e.g. from a menu item); omit for the built-in trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const search = useExampleSentences();
  const importMany = useCreateSentencesMany();
  const results = search.data ?? [];

  const run = () => {
    const q = query.trim();
    if (!q) return;
    setSelected(new Set());
    search.mutate(q);
  };

  const submit = async () => {
    const inputs = results
      .filter(r => selected.has(r.id))
      .map(toCreateInput);
    if (inputs.length === 0) return;
    await importMany.mutateAsync(inputs);
    setOpen(false);
    setSelected(new Set());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSelected(new Set());
      }}
    >
      {isControlled
        ? null
        : (
          <DialogTrigger asChild>
            <Button variant="outline">
              <Download className="size-4" />
              Import from Tatoeba
            </Button>
          </DialogTrigger>
        )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import sentences from Tatoeba</DialogTitle>
          <DialogDescription>
            Search real Japanese example sentences and add the ones you pick to your bank. Each keeps a
            Tatoeba attribution in its notes (CC-BY 2.0 FR).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  run();
                }
              }}
              placeholder="Word or phrase to search for…"
              aria-label="Tatoeba search"
            />
            <Button
              type="button"
              variant="outline"
              onClick={run}
              disabled={search.isPending || !query.trim()}
            >
              <Search className="size-4" />
              {search.isPending ? "Searching…" : "Search"}
            </Button>
          </div>

          {search.isSuccess && results.length === 0
            ? <p className="text-sm text-muted-foreground">No examples found.</p>
            : null}

          {results.length > 0
            ? (
              <FuriganaScope>
                <div
                  className="
                    max-h-72 space-y-1 overflow-y-auto rounded-md border p-2
                  "
                >
                  {results.map(r => (
                    <label
                      key={r.id}
                      className="
                        flex cursor-pointer items-start gap-2 rounded-sm px-1.5
                        py-1 text-sm
                        hover:bg-muted
                      "
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={selected.has(r.id)}
                        onCheckedChange={() => setSelected(prev => toggle(prev, r.id))}
                      />
                      <span>
                        <span lang="ja">
                          <SentenceText
                            text={r.text}
                            reading={r.reading}
                          />
                        </span>
                        {r.translation
                          ? (
                            <BlurReveal
                              className="
                                mt-0.5 block text-xs text-muted-foreground
                              "
                            >
                              {r.translation}
                            </BlurReveal>
                          )
                          : null}
                      </span>
                    </label>
                  ))}
                </div>
              </FuriganaScope>
            )
            : null}

          {results.length > 0
            ? (
              <Button
                disabled={selected.size === 0 || importMany.isPending}
                onClick={() => void submit()}
              >
                {importMany.isPending
                  ? "Importing…"
                  : `Import ${selected.size || ""}`.trim()}
              </Button>
            )
            : null}

          <p className="text-xs text-muted-foreground">
            Examples from
            {" "}
            <a
              href="https://tatoeba.org"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Tatoeba
            </a>
            {" "}
            · CC-BY 2.0 FR
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
