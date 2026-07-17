import { useState } from "react";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExampleSentences } from "@/hooks/useTatoeba";

/** What a picked example passes back to the form: the JP text, its EN gloss, and the Tatoeba id. */
export interface PickedExample {
  id: number;
  text: string;
  translation: string | null;
}

/**
 * Searches Tatoeba for example sentences containing a word and lets the user pick one to seed a
 * sentence. Sentences are CC-BY 2.0 FR — the footer credits Tatoeba.
 */
export function TatoebaExamplePicker({
  defaultQuery,
  onUse,
}: {
  defaultQuery: string;
  onUse: (example: PickedExample) => void;
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
                className="
                  flex items-start justify-between gap-3 rounded-sm p-2
                  hover:bg-muted/50
                "
              >
                <div className="min-w-0">
                  <p lang="ja">{r.text}</p>
                  {r.translation
                    ? <p className="text-sm text-muted-foreground">{r.translation}</p>
                    : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => onUse({
                    id: r.id,
                    text: r.text,
                    translation: r.translation,
                  })}
                >
                  Use
                </Button>
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
