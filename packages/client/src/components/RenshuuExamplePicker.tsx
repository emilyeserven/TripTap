import type { RenshuuExampleSentence } from "@sentence-bank/types";

import { useState } from "react";

import { Check, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { BlurReveal } from "@/components/BlurReveal";
import { SentenceText } from "@/components/SentenceText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRenshuuExamples } from "@/hooks/useRenshuu";
import { useCreateSentence } from "@/hooks/useSentences";

/** One Renshuu result: the sentence, its kana reading, English, and an "Add to bank" action. */
function ResultRow({
  sentence,
  added,
  onAdd,
  disabled,
}: {
  sentence: RenshuuExampleSentence;
  added: boolean;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <li className="flex items-start justify-between gap-2 rounded-sm p-2">
      <div className="min-w-0 space-y-0.5">
        <p lang="ja">
          <SentenceText
            text={sentence.text}
            reading={sentence.reading}
          />
        </p>
        {sentence.translation
          ? (
            <BlurReveal className="text-sm text-muted-foreground">
              {sentence.translation}
            </BlurReveal>
          )
          : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAdd}
        disabled={disabled || added}
        aria-label={added ? "Added to bank" : "Add to sentence bank"}
      >
        {added
          ? <Check className="size-4" />
          : <Plus className="size-4" />}
        {added ? "Added" : "Add to bank"}
      </Button>
    </li>
  );
}

/**
 * Searches Renshuu's example-sentence bank for a word (Japanese or English) using the learner's
 * stored API key, and lets each result be imported into the sentence bank (text + English; the
 * server generates furigana). Seeds its search box from `defaultQuery` (the mistake's Japanese).
 */
export function RenshuuExamplePicker({
  defaultQuery,
}: {
  defaultQuery: string;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const search = useRenshuuExamples();
  const create = useCreateSentence();
  const results = search.data ?? [];

  const run = () => {
    const q = query.trim();
    if (q) search.mutate(q);
  };

  async function add(sentence: RenshuuExampleSentence) {
    // Mirror the Tatoeba import convention: tag + a source note so imported rows stay identifiable.
    await create.mutateAsync({
      text: sentence.text,
      translation: sentence.translation,
      language: "Japanese",
      tags: "renshuu",
      notes: `From Renshuu #${sentence.id}`,
    });
    setAdded((prev) => {
      const next = new Set(prev);
      next.add(sentence.id);
      return next;
    });
    toast.success("Added to sentence bank");
  }

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
          aria-label="Renshuu search"
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
          <FuriganaScope>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {results.map(r => (
                <ResultRow
                  key={r.id}
                  sentence={r}
                  added={added.has(r.id)}
                  onAdd={() => void add(r)}
                  disabled={create.isPending}
                />
              ))}
            </ul>
          </FuriganaScope>
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
  );
}
