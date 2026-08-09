import type { KanjiListQuery, KanjiSort, KanjiStatus } from "@sentence-bank/types";

import { useState } from "react";

import { KANJI_SORTS, KANJI_STATUSES } from "@sentence-bank/types";
import { createFileRoute } from "@tanstack/react-router";

import { KanjiGrid } from "@/components/KanjiGrid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKanjiList } from "@/hooks/useKanji";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/kanji/")({
  component: KanjiPage,
});

/** Human labels for the sort options. */
const SORT_LABEL: Record<KanjiSort, string> = {
  occurrences: "Most frequent",
  recent: "Recently seen",
  char: "Character order",
};

/** Human labels for the status filter. */
const STATUS_LABEL: Record<KanjiStatus, string> = {
  new: "Not started",
  learning: "Learning",
  known: "Known",
};

/** The sentinel the Select uses for "no status filter" — Radix treats "" as no value at all. */
const ANY = "any";

function KanjiPage() {
  usePageTitle("Kanji");
  const [sort, setSort] = useState<KanjiSort>("occurrences");
  const [status, setStatus] = useState<KanjiStatus | typeof ANY>(ANY);

  const query: KanjiListQuery = {
    sort,
    ...(status === ANY
      ? {}
      : {
        status,
      }),
  };
  const {
    data: kanji, isLoading, error,
  } = useKanjiList(query);

  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Every character you’ve met across your sentences, vocabulary, dialogues and writing — how
        often it turns up, and where. Counts are derived from your corpus, so they stay honest as it
        grows.
      </p>

      <div className="flex flex-wrap gap-3">
        <Select
          value={sort}
          onValueChange={v => setSort(v as KanjiSort)}
        >
          <SelectTrigger
            className="w-48"
            aria-label="Sort kanji"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KANJI_SORTS.map(s => (
              <SelectItem
                key={s}
                value={s}
              >
                {SORT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={v => setStatus(v as KanjiStatus | typeof ANY)}
        >
          <SelectTrigger
            className="w-48"
            aria-label="Filter by status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All statuses</SelectItem>
            {KANJI_STATUSES.map(s => (
              <SelectItem
                key={s}
                value={s}
              >
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {kanji
        ? (
          <>
            <p className="text-sm text-muted-foreground">
              {`${kanji.length} ${kanji.length === 1 ? "character" : "characters"}`}
            </p>
            <KanjiGrid kanji={kanji} />
          </>
        )
        : null}
    </section>
  );
}
