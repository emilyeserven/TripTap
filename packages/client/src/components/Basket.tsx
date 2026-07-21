import type {
  BasketGrammar,
  BasketItem,
  BasketSentence,
  BasketVocab,
} from "@/stores/basketStore";

import { ShoppingBasket, X } from "lucide-react";

import { SentenceText } from "./SentenceText";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { basketKey, useBasketStore } from "@/stores/basketStore";
import { useDisplayStore } from "@/stores/displayStore";

/** A per-row remove button (small ×), shared by every basket row. */
function RemoveRow({
  itemKey,
}: {
  itemKey: string;
}) {
  const remove = useBasketStore(s => s.remove);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-6 shrink-0 text-muted-foreground"
      aria-label="Remove from basket"
      onClick={() => remove(itemKey)}
    >
      <X className="size-4" />
    </Button>
  );
}

function SentenceRow({
  item,
}: {
  item: BasketSentence;
}) {
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm">
          <SentenceText
            text={item.text}
            reading={item.reading}
          />
        </p>
        {item.translation
          ? <p className="text-xs text-muted-foreground">{item.translation}</p>
          : null}
      </div>
      <RemoveRow itemKey={basketKey("sentence", item.id)} />
    </li>
  );
}

function VocabRow({
  item,
}: {
  item: BasketVocab;
}) {
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{item.term}</span>
          {item.reading
            ? <span className="ml-2 text-xs text-muted-foreground">{item.reading}</span>
            : null}
        </p>
        {item.meaning ? <p className="text-xs text-muted-foreground">{item.meaning}</p> : null}
      </div>
      <RemoveRow itemKey={basketKey("vocab", item.id)} />
    </li>
  );
}

function GrammarRow({
  item,
}: {
  item: BasketGrammar;
}) {
  const cue = item.examples[0];
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1 space-y-1">
        {/* The construction itself, surfaced as a cue chip. */}
        <span
          className="
            inline-block rounded-md border bg-muted px-2 py-0.5 text-sm
            font-medium
          "
        >
          {item.pattern}
        </span>
        {item.gloss ? <p className="text-xs text-muted-foreground">{item.gloss}</p> : null}
        {cue
          ? (
            <p className="border-l-2 pl-2 text-xs text-muted-foreground">
              {cue.jp}
            </p>
          )
          : null}
      </div>
      <RemoveRow itemKey={basketKey("grammar", item.id)} />
    </li>
  );
}

/** Render one grouped section (title + rows) only when it has items. */
function Section<T extends BasketItem>({
  title,
  items,
  render,
}: {
  title: string;
  items: T[];
  render: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <h3
        className="
          text-xs font-semibold tracking-wide text-muted-foreground uppercase
        "
      >
        {`${title} (${items.length})`}
      </h3>
      <ul className="space-y-2">{items.map(render)}</ul>
    </div>
  );
}

/**
 * The Basket overlay: a collapsible scratchpad pinned to the bottom-right on every page, holding model
 * sentences, target vocab, and grammar constructions the learner collects while browsing. Collapsed, it
 * is a floating pill showing the count; expanded, it is a panel with grouped sections (grammar rows lead
 * with the construction pattern as a cue). Mounted once in `__root.tsx`. Hidden in slide / super-focus
 * modes (which are distraction-free), and returns null when empty.
 */
export function Basket() {
  const items = useBasketStore(s => s.items);
  const expanded = useBasketStore(s => s.expanded);
  const setExpanded = useBasketStore(s => s.setExpanded);
  const clear = useBasketStore(s => s.clear);
  const slideMode = useDisplayStore(s => s.slideMode);
  const superFocus = useDisplayStore(s => s.superFocus);

  // Nothing to keep, or a distraction-free mode is on → stay out of the way.
  if (items.length === 0 || slideMode || superFocus) {
    return null;
  }

  if (!expanded) {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <Button
          type="button"
          variant="secondary"
          className="shadow-lg"
          aria-label={`Open basket (${items.length})`}
          onClick={() => setExpanded(true)}
        >
          <ShoppingBasket className="size-4" />
          Basket
          <span
            className="
              ml-1 rounded-full bg-primary px-1.5 text-xs
              text-primary-foreground
            "
          >
            {items.length}
          </span>
        </Button>
      </div>
    );
  }

  const sentences = items.filter((i): i is BasketSentence => i.kind === "sentence");
  const vocab = items.filter((i): i is BasketVocab => i.kind === "vocab");
  const grammar = items.filter((i): i is BasketGrammar => i.kind === "grammar");

  return (
    <div
      className="
        fixed right-4 bottom-4 z-50 flex max-h-[70vh] w-80 flex-col rounded-xl
        border bg-card text-card-foreground shadow-lg
      "
    >
      <div className="flex items-center gap-2 border-b p-3">
        <ShoppingBasket className="size-4" />
        <span className="text-sm font-semibold">
          {`Basket (${items.length})`}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={clear}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Collapse basket"
            onClick={() => setExpanded(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <Section
          title="Sentences"
          items={sentences}
          render={item => (
            <SentenceRow
              key={basketKey("sentence", item.id)}
              item={item}
            />
          )}
        />
        {sentences.length > 0 && (vocab.length > 0 || grammar.length > 0)
          ? <Separator />
          : null}
        <Section
          title="Vocabulary"
          items={vocab}
          render={item => (
            <VocabRow
              key={basketKey("vocab", item.id)}
              item={item}
            />
          )}
        />
        {vocab.length > 0 && grammar.length > 0 ? <Separator /> : null}
        <Section
          title="Grammar"
          items={grammar}
          render={item => (
            <GrammarRow
              key={basketKey("grammar", item.id)}
              item={item}
            />
          )}
        />
      </div>
    </div>
  );
}
