import type { FuriToken, SentenceDestination, SentenceDraft } from "@sentence-bank/types";
import type { ReactNode } from "react";

import { useState } from "react";

import { Download, Search } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { BlurReveal } from "@/components/BlurReveal";
import { SentenceDestinationPicker } from "@/components/SentenceDestinationPicker";
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
import { useSentenceDestination } from "@/hooks/useSentenceDestination";

/** The minimal shape an importable example needs to render + be selected. */
export interface ImportableExample {
  id: number;
  text: string;
  reading: FuriToken[] | null;
  translation: string | null;
}

/** The slice of a TanStack search mutation the dialog reads — kept minimal so any provider hook fits. */
export interface ExampleSearchState<T> {
  data?: T[];
  mutate: (query: string) => void;
  isPending: boolean;
  isSuccess: boolean;
}

/** Toggle a value's membership in a Set (immutably). */
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Search an external example-sentence provider and import the chosen results.
 *
 * The provider-specific bits — the search hook state, how a result maps to a draft, and the
 * copy/attribution — are injected; the search box, result picker, destination choice and import
 * flow are shared. Backs both {@link ./RenshuuImportDialog} and {@link ./TatoebaImportDialog}.
 *
 * The destination is the learner's, not the provider's: a good example found here can go to the
 * bank, to My Sentences, or straight to Practice.
 */
export function SentenceImportDialog<T extends ImportableExample>({
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  triggerLabel,
  searchAriaLabel,
  search,
  toDraft,
  destinations,
  defaultDestination = "bank",
  footer,
}: {
  /** Control the dialog externally (e.g. from a menu item); omit for the built-in trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: ReactNode;
  triggerLabel: string;
  searchAriaLabel: string;
  search: ExampleSearchState<T>;
  toDraft: (example: T) => SentenceDraft;
  /**
   * Narrow which destinations this provider offers. Omit for all three. A single-entry list hides
   * the picker — there is no choice to make — which is how Tatoeba's attribution requirement is
   * honoured (its licence credit lives in `notes`, a bank-only column).
   */
  destinations?: readonly SentenceDestination[];
  /** Where the picker starts. Providers of reference examples default to the bank. */
  defaultDestination?: SentenceDestination;
  footer: ReactNode;
}) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [destination, setDestination] = useState<SentenceDestination>(defaultDestination);

  const importMany = useSentenceDestination(destination);
  const results = search.data ?? [];
  const drafts = results.filter(r => selected.has(r.id)).map(toDraft);

  const run = () => {
    const q = query.trim();
    if (!q) return;
    setSelected(new Set());
    search.mutate(q);
  };

  const submit = async () => {
    if (drafts.length === 0) return;
    await importMany.createMany(drafts);
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
              {triggerLabel}
            </Button>
          </DialogTrigger>
        )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
              aria-label={searchAriaLabel}
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
              <>
                {destinations?.length === 1
                  ? null
                  : (
                    <SentenceDestinationPicker
                      value={destination}
                      onChange={setDestination}
                      drafts={drafts}
                      options={destinations}
                    />
                  )}
                <Button
                  disabled={selected.size === 0 || importMany.isPending}
                  onClick={() => void submit()}
                >
                  {importMany.isPending
                    ? "Importing…"
                    : `Import ${selected.size || ""}`.trim()}
                </Button>
              </>
            )
            : null}

          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}
