import { useState } from "react";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExampleSentences } from "@/hooks/useTatoeba";

/**
 * Searches Tatoeba for real Japanese example sentences containing a word — a read-only reference
 * while reviewing a drill mistake. On purpose there's no "use this" action: the sentences stay
 * Tatoeba's (CC-BY 2.0 FR, credited in the footer), so we don't copy them into the learner's own
 * sentences. Seeds its search box from `defaultQuery` (the mistake's Japanese).
 */
export function TatoebaExamplePicker({
  defaultQuery,
}: {
  defaultQuery: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const search = useExampleSentences();
  const results = search.data ?? [];

  const run = () => {
    const q = query.trim();
    if (q) search.mutate(q);
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
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
          placeholder="Word to find examples for…"
          aria-label="Tatoeba search"
        />
        <Button
          type="button"
          variant="outline"
          onClick={run}
          disabled={search.isPending || !query.trim()}
        >
          <Search className="size-4" />
          {search.isPending ? "Searching…" : "Find examples"}
        </Button>
      </div>

      {search.isSuccess && results.length === 0
        ? <p className="text-sm text-muted-foreground">No examples found.</p>
        : null}

      {results.length > 0
        ? (
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {results.map(r => (
              <li
                key={r.id}
                className="rounded-sm p-2"
              >
                <p lang="ja">{r.text}</p>
                {r.translation
                  ? <p className="text-sm text-muted-foreground">{r.translation}</p>
                  : null}
              </li>
            ))}
          </ul>
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
  );
}
