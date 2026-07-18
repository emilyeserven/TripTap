import type { CreateSentenceInput, RenshuuExampleSentence } from "@sentence-bank/types";

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
import { useRenshuuExamples } from "@/hooks/useRenshuu";
import { useCreateSentencesMany } from "@/hooks/useSentences";

/** Toggle a value's membership in a Set (immutably). */
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Build a bank sentence from a Renshuu result. The text is already normalized toward the common
 * written form server-side; a `renshuu` tag plus a source note keep imported rows identifiable.
 */
function toCreateInput(example: RenshuuExampleSentence): CreateSentenceInput {
  return {
    text: example.text,
    translation: example.translation,
    language: "Japanese",
    tags: "renshuu",
    notes: `From Renshuu #${example.id}`,
  };
}

/**
 * Search Renshuu's example-sentence bank (using the learner's stored API key) and import the chosen
 * sentences straight into the bank. The server-generated furigana previews here; the bank regenerates
 * it (with vocab overrides) on import. Parallels {@link ./TatoebaImportDialog}.
 */
export function RenshuuImportDialog({
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

  const search = useRenshuuExamples();
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
              Import from Renshuu
            </Button>
          </DialogTrigger>
        )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import sentences from Renshuu</DialogTitle>
          <DialogDescription>
            Search Renshuu’s example sentences and add the ones you pick to your bank. Uncommon kanji
            are normalized to the usual spelling and furigana is generated.
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
              aria-label="Renshuu search"
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
              href="https://www.renshuu.org"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Renshuu
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
