import type { FuriToken } from "@sentence-bank/types";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Which kind of item lives in the basket; also picks which row renderer to use. */
export type BasketKind = "sentence" | "vocab" | "grammar";

/** A model sentence kept in the basket (standalone bank sentence or AI-lesson source sentence). */
export interface BasketSentence {
  kind: "sentence";
  id: string;
  /** The sentence in the target language. */
  text: string;
  /** Translation, or null when text-only. */
  translation: string | null;
  /** Furigana segmentation, when available (standalone sentences only); null otherwise. */
  reading: FuriToken[] | null;
}

/** A vocabulary entry kept in the basket (standalone bank vocab or AI-lesson vocab). */
export interface BasketVocab {
  kind: "vocab";
  id: string;
  /** The word/term. */
  term: string;
  /** Reading/pronunciation, or null. */
  reading: string | null;
  /** Meaning, or null. */
  meaning: string | null;
}

/** A grammar point kept in the basket. The `pattern` is shown as the construction cue. */
export interface BasketGrammar {
  kind: "grammar";
  id: string;
  /** The construction pattern, e.g. "〜たいんですが" — surfaced as the cue. */
  pattern: string;
  /** Short gloss of what the construction does, or null. */
  gloss: string | null;
  /** Paragraph-length explanation, or null. */
  note: string | null;
  /** Example sentences demonstrating the construction. */
  examples: { jp: string;
    en: string; }[];
}

/** A single basket entry; discriminated by {@link BasketKind}. */
export type BasketItem = BasketSentence | BasketVocab | BasketGrammar;

/**
 * Stable membership key for a basket item. Standalone and AI-lesson ids come from different tables, so
 * the id is only unique *within* a kind — prefix with the kind to key a mixed basket without collisions.
 */
export function basketKey(kind: BasketKind, id: string): string {
  return `${kind}:${id}`;
}

interface BasketState {
  /** The collected items, in insertion order. */
  items: BasketItem[];
  /** Whether the overlay is expanded (vs. the collapsed pill). */
  expanded: boolean;
  /** Add an item; a no-op when an item with the same {@link basketKey} is already present. */
  add: (item: BasketItem) => void;
  /** Remove the item with the given {@link basketKey}. */
  remove: (key: string) => void;
  /** Empty the basket. */
  clear: () => void;
  /** Expand or collapse the overlay. */
  setExpanded: (on: boolean) => void;
}

/**
 * The basket: a browser-local scratchpad of model sentences, target vocab, and grammar constructions
 * the learner collects while browsing. Persisted via Zustand's `persist` middleware (mirroring
 * {@link useDisplayStore}) so the collection survives reloads; localStorage access is guarded so
 * private-mode / non-browser environments fall back to an empty basket.
 */
export const useBasketStore = create<BasketState>()(
  persist(
    (set, get) => ({
      items: [],
      expanded: false,
      add: (item) => {
        const key = basketKey(item.kind, item.id);
        if (get().items.some(i => basketKey(i.kind, i.id) === key)) {
          return;
        }
        set(state => ({
          items: [...state.items, item],
          // First add opens the basket so the learner sees where it went.
          expanded: state.items.length === 0 ? true : state.expanded,
        }));
      },
      remove: key =>
        set(state => ({
          items: state.items.filter(i => basketKey(i.kind, i.id) !== key),
        })),
      clear: () => set({
        items: [],
      }),
      setExpanded: on => set({
        expanded: on,
      }),
    }),
    {
      name: "triptap-basket",
      storage: createJSONStorage(() => globalThis.localStorage),
      version: 1,
      // The collapsed/expanded chrome state shouldn't be restored — always start collapsed on load.
      partialize: state => ({
        items: state.items,
      }),
    },
  ),
);
