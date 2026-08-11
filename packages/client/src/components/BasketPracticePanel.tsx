import type { BasketGrammarNote, BasketVocab } from "@/stores/basketStore";

import { useMemo } from "react";

import { ShoppingBasket } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBasketItems } from "@/hooks/useBasket";
import { basketKey } from "@/stores/basketStore";

/**
 * A passive reminder of the grammar and vocab in your basket — the things you actually want to
 * practice — shown beside the My Writing editor so you can consciously work them into what you write.
 * Read-only: it doesn't gate anything. Renders nothing when the basket holds neither.
 *
 * Reads the same basket the overlay does, so a vocab item collected on the Vocabulary page shows up
 * here without a second concept to maintain.
 */
export function BasketPracticePanel() {
  const items = useBasketItems();

  const grammar = useMemo(
    () => items.filter((i): i is BasketGrammarNote => i.kind === "grammar-note"),
    [items],
  );

  const vocab = useMemo(
    () => items.filter((i): i is BasketVocab => i.kind === "vocab" || i.kind === "lesson-vocab"),
    [items],
  );

  if (grammar.length === 0 && vocab.length === 0) return null;

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <ShoppingBasket className="size-4 text-primary" />
          Practice these
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Items in your basket — try to work some into what you’re writing.
        </p>
        {grammar.length > 0
          ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Grammar</p>
              <ul className="space-y-0.5">
                {grammar.map(n => (
                  <li
                    key={n.id}
                    className="text-sm"
                  >
                    {n.title}
                    {n.nuance ? <span className="text-muted-foreground"> · {n.nuance}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}
        {vocab.length > 0
          ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Vocab</p>
              <ul className="space-y-0.5">
                {vocab.map(v => (
                  <li
                    key={basketKey(v.kind, v.id)}
                    className="text-sm"
                  >
                    {v.term}
                    {v.reading ? <span className="text-muted-foreground"> ({v.reading})</span> : null}
                    {v.meaning ? <span className="text-muted-foreground"> — {v.meaning}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}
      </CardContent>
    </Card>
  );
}
