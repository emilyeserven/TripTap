import type {
  BasketGrammar,
  BasketGrammarNote,
  BasketItem,
  BasketResource,
  BasketSentence,
  BasketVocab,
} from "@/stores/basketStore";
import type { ShadowingList } from "@sentence-bank/types";

import { useState } from "react";

import { ImageOff, ListMusic, NotebookPen, ShoppingBasket, X } from "lucide-react";
import { toast } from "sonner";

import { SentenceText } from "./SentenceText";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useBasketItems, useBasketToggle, useClearBasket } from "@/hooks/useBasket";
import { useCreatePracticeSentencesMany } from "@/hooks/usePracticeSentences";
import { useShadowingLists, useUpdateShadowingList } from "@/hooks/useShadowingLists";
import { basketKey, useBasketStore } from "@/stores/basketStore";
import { useDisplayStore } from "@/stores/displayStore";

/**
 * A per-row remove button (small ×), shared by every basket row. Routes through the toggle so removing
 * a server-backed item clears its durable flag rather than only the local copy.
 */
function RemoveRow({
  item,
}: {
  item: BasketItem;
}) {
  const {
    toggle, pending,
  } = useBasketToggle(item);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-6 shrink-0 text-muted-foreground"
      aria-label="Remove from basket"
      disabled={pending}
      onClick={toggle}
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
      <RemoveRow item={item} />
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
      <RemoveRow item={item} />
    </li>
  );
}

function GrammarNoteRow({
  item,
}: {
  item: BasketGrammarNote;
}) {
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        {item.nuance ? <p className="text-xs text-muted-foreground">{item.nuance}</p> : null}
      </div>
      <RemoveRow item={item} />
    </li>
  );
}

function ResourceRow({
  item,
}: {
  item: BasketResource;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {item.imageUrl
          ? (
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              className="h-8 w-12 shrink-0 rounded-sm object-cover"
            />
          )
          : (
            <span
              className="
                flex h-8 w-12 shrink-0 items-center justify-center rounded-sm
                bg-muted
              "
            >
              <ImageOff className="size-3.5 text-muted-foreground" />
            </span>
          )}
        <p className="min-w-0 flex-1 truncate text-sm">{item.title}</p>
      </div>
      <RemoveRow item={item} />
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
      <RemoveRow item={item} />
    </li>
  );
}

/**
 * Send-to actions for the basket's sentence section — the basket's exit doors. "To practice" bulk-
 * creates practice sentences from the snapshots; "To list" appends them to a chosen shadowing list.
 * Sent items leave the basket on success.
 */
function SentenceSendActions({
  sentences,
}: {
  sentences: BasketSentence[];
}) {
  const remove = useBasketStore(s => s.remove);
  const createPractice = useCreatePracticeSentencesMany();
  const {
    data: lists,
  } = useShadowingLists();
  const updateList = useUpdateShadowingList();
  const [listOpen, setListOpen] = useState(false);

  const pending = createPractice.isPending || updateList.isPending;

  const sendToPractice = () => {
    createPractice.mutate(
      // Basket snapshots don't carry a language; default to the app-wide form default.
      sentences.map(s => ({
        text: s.text,
        translation: s.translation,
        language: "Japanese",
      })),
      {
        onSuccess: () => {
          for (const s of sentences) remove(basketKey("sentence", s.id));
        },
      },
    );
  };

  const addToList = (list: ShadowingList) => {
    // AI-lesson source sentences share the basket "sentence" kind but aren't bank rows; storing
    // their ids on a list would leave entries that never resolve. Items added before the basket
    // carried a `source` have an unknown provenance, so they're skipped too.
    const resolvable = sentences.filter(s => s.source === "bank");
    const skipped = sentences.length - resolvable.length;
    if (resolvable.length === 0) {
      toast.error("None of these are bank sentences, so they can't join a shadowing list.");
      return;
    }
    updateList.mutate(
      {
        id: list.id,
        input: {
          sentenceIds: [...new Set([...list.sentenceIds, ...resolvable.map(s => s.id)])],
        },
      },
      {
        onSuccess: () => {
          setListOpen(false);
          for (const s of resolvable) remove(basketKey("sentence", s.id));
          toast.success(
            `Added ${resolvable.length} to “${list.name}”${
              skipped > 0 ? ` (${skipped} skipped — not bank sentences)` : ""
            }`,
          );
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 px-2 text-xs"
        disabled={pending}
        onClick={sendToPractice}
      >
        <NotebookPen className="size-3.5" />
        To practice
      </Button>
      <Popover
        open={listOpen}
        onOpenChange={setListOpen}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            disabled={pending}
          >
            <ListMusic className="size-3.5" />
            To list
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-56 p-2"
        >
          {(lists ?? []).length === 0
            ? (
              <p className="p-1 text-xs text-muted-foreground">
                No shadowing lists yet — create one from a sentence card first.
              </p>
            )
            : (
              <ul className="space-y-1">
                {(lists ?? []).map(l => (
                  <li key={l.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full justify-start px-2 text-xs"
                      disabled={pending}
                      onClick={() => addToList(l)}
                    >
                      {l.name}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
        </PopoverContent>
      </Popover>
    </div>
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
 * The Basket overlay: a collapsible collection pinned to the bottom-right on every page, holding the
 * model sentences, vocab, grammar constructions, grammar notes and resources the learner gathers while
 * browsing. Collapsed, it is a floating pill showing the count; expanded, it is a panel with grouped
 * sections (grammar rows lead with the construction pattern as a cue). Mounted once in `__root.tsx`.
 * Hidden in slide / super-focus modes (which are distraction-free), and returns null when empty.
 *
 * Some sections are server-backed (see `DURABLE_KINDS`) — those rows come from the API, so they are
 * already here on a fresh browser, and clearing them writes to the server.
 */
export function Basket() {
  const items = useBasketItems();
  const expanded = useBasketStore(s => s.expanded);
  const setExpanded = useBasketStore(s => s.setExpanded);
  const {
    clear, durableCount,
  } = useClearBasket();
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
  const vocab = items.filter((i): i is BasketVocab =>
    i.kind === "vocab" || i.kind === "lesson-vocab");
  const grammar = items.filter((i): i is BasketGrammar => i.kind === "grammar");
  const grammarNotes = items.filter((i): i is BasketGrammarNote => i.kind === "grammar-note");
  const resources = items.filter((i): i is BasketResource => i.kind === "resource");

  // Clearing un-stars server-backed items, which is not something to do by accident — say how many.
  const confirmClear = () => {
    if (durableCount > 0) {
      const noun = durableCount === 1 ? "item is" : "items are";
      const saved = `${durableCount} ${noun}`;
      if (!globalThis.confirm(
        `Clear the basket? ${saved} saved to your account and will be removed there too.`,
      )) {
        return;
      }
    }
    clear();
  };

  // Each group renders its own block; separators only appear between two non-empty neighbours, so the
  // panel never opens on a stray rule.
  const blocks: { key: string;
    node: React.ReactNode; }[] = [
    sentences.length > 0
      ? {
        key: "sentences",
        node: (
          <>
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
            <SentenceSendActions sentences={sentences} />
          </>
        ),
      }
      : null,
    vocab.length > 0
      ? {
        key: "vocab",
        node: (
          <Section
            title="Vocabulary"
            items={vocab}
            render={item => (
              <VocabRow
                key={basketKey(item.kind, item.id)}
                item={item}
              />
            )}
          />
        ),
      }
      : null,
    grammar.length > 0
      ? {
        key: "grammar",
        node: (
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
        ),
      }
      : null,
    grammarNotes.length > 0
      ? {
        key: "grammar-notes",
        node: (
          <Section
            title="Grammar notes"
            items={grammarNotes}
            render={item => (
              <GrammarNoteRow
                key={basketKey("grammar-note", item.id)}
                item={item}
              />
            )}
          />
        ),
      }
      : null,
    resources.length > 0
      ? {
        key: "resources",
        node: (
          <Section
            title="Resources"
            items={resources}
            render={item => (
              <ResourceRow
                key={basketKey("resource", item.id)}
                item={item}
              />
            )}
          />
        ),
      }
      : null,
  ].filter(b => b !== null);

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
            onClick={confirmClear}
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
        {blocks.map((block, i) => (
          <div
            key={block.key}
            className="space-y-4"
          >
            {i > 0 ? <Separator /> : null}
            {block.node}
          </div>
        ))}
      </div>
    </div>
  );
}
