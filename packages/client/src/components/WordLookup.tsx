import type { DictionaryEntry } from "@sentence-bank/types";

import { useState } from "react";

import { Loader2, Search } from "lucide-react";

import { LevelBadge } from "@/components/ai-lesson/LevelBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDictionarySearch } from "@/hooks/useDictionary";

/**
 * A per-row "look up" affordance for a lesson word note: a popover with a dictionary search seeded from
 * the row's current word. Owns its own search mutation and open state so each row is independent.
 * Picking a result hands the whole {@link DictionaryEntry} back to the caller, which decides how to fill
 * the row (keeping the kana-only reading rule in one place).
 */
export function WordLookup({
  word,
  onPick,
}: {
  word: string;
  onPick: (entry: DictionaryEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useDictionarySearch();

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (trimmed) search.mutate(trimmed);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Seed the query from the row's word and auto-run the lookup when opening.
    if (next) {
      const seed = word.trim();
      setQuery(seed);
      runSearch(seed);
    }
  };

  const results = search.data ?? [];

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Look up word in the dictionary"
        >
          <Search className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 space-y-3"
      >
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the dictionary"
            aria-label="Dictionary search"
            autoFocus
          />
          <Button
            type="submit"
            size="sm"
            disabled={!query.trim() || search.isPending}
          >
            {search.isPending
              ? <Loader2 className="size-4 animate-spin" />
              : <Search className="size-4" />}
          </Button>
        </form>

        {search.isError
          ? (
            <p className="text-sm text-destructive">
              {search.error instanceof Error ? search.error.message : "Lookup failed."}
            </p>
          )
          : null}

        {search.isSuccess && results.length === 0
          ? <p className="text-sm text-muted-foreground">No matches.</p>
          : null}

        {results.length > 0
          ? (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {results.map((entry, i) => (
                <li key={`${entry.word}-${entry.reading}-${i}`}>
                  <button
                    type="button"
                    className="
                      w-full space-y-1 rounded-md border p-2 text-left
                      hover:bg-accent
                    "
                    onClick={() => {
                      onPick(entry);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium">{entry.word}</span>
                      {entry.reading && entry.reading !== entry.word
                        ? <span className="text-sm text-muted-foreground">{entry.reading}</span>
                        : null}
                      {entry.jlpt ? <LevelBadge lvl={entry.jlpt} /> : null}
                      {entry.common ? <Badge variant="secondary">common</Badge> : null}
                    </div>
                    {entry.meanings.length > 0
                      ? <p className="text-sm">{entry.meanings.slice(0, 3).join("; ")}</p>
                      : null}
                  </button>
                </li>
              ))}
            </ul>
          )
          : null}
      </PopoverContent>
    </Popover>
  );
}
