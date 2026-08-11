import { useMemo, useState } from "react";

import { SENTENCE_KIND_INFO } from "@sentence-bank/types";
import { Link } from "@tanstack/react-router";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { SentenceText } from "@/components/SentenceText";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSentences } from "@/hooks/useSentences";

/**
 * The "All" view of the unified Sentences page: every sentence regardless of kind, as compact rows
 * with a kind badge. A cross-kind search surface — the per-kind views carry the richer cards and
 * tooling.
 */
export function AllSentencesView() {
  const {
    data: sentences, isLoading, error,
  } = useSentences();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sentences ?? [];
    return (sentences ?? []).filter(s =>
      s.text.toLowerCase().includes(q)
      || (s.translation ?? "").toLowerCase().includes(q)
      || (s.correction ?? "").toLowerCase().includes(q)
      || (s.notes ?? "").toLowerCase().includes(q)
      || (s.tags ?? "").toLowerCase().includes(q));
  }, [sentences, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Every sentence in one place — bank examples, your own sentences, and study cards.
      </p>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search all sentences…"
        aria-label="Search all sentences"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing ? <p className="text-muted-foreground">No matching sentences.</p> : null}

      <FuriganaScope>
        <div className="space-y-2">
          {shown.map((s) => {
            // For a corrected mine-kind sentence, lead with the fix (matching the mine view).
            const corrected = s.kind === "mine" && s.correction?.trim() ? s.correction : null;
            return (
              <Card key={s.id}>
                <CardContent
                  className="flex items-start justify-between gap-3 p-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      to="/sentences/$id"
                      params={{
                        id: s.id,
                      }}
                      className="
                        block text-base font-medium
                        hover:underline
                      "
                      lang="ja"
                    >
                      {corrected ?? (
                        <SentenceText
                          text={s.text}
                          reading={s.reading}
                        />
                      )}
                    </Link>
                    {s.translation
                      ? <p className="truncate text-sm text-muted-foreground">{s.translation}</p>
                      : null}
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0"
                  >
                    {SENTENCE_KIND_INFO[s.kind].label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </FuriganaScope>
    </section>
  );
}
