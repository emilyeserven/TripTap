import type { FuriToken, SentenceKind } from "@sentence-bank/types";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Which kind of item lives in the basket; also picks which row renderer to use. */
export type BasketKind
  = | "sentence"
    | "vocab"
    | "lesson-vocab"
    | "grammar"
    | "grammar-note"
    | "resource";

/**
 * The kinds whose membership is *server* truth rather than this store's.
 *
 * The basket used to be a purely browser-local scratchpad while a parallel "favorites"/"starred"
 * feature kept the same idea in the database. The basket won, so the star affordances are gone — but
 * their storage stayed, and these kinds now **write through** to it: bank vocab to `vocab.starred`,
 * AI-lesson vocab to `ai_lesson_vocab.starred`, grammar notes to `grammar_notes.starred`, and bookmark
 * resources to the `start.favoriteResourceIds` settings blob. Those fields still feed the Start
 * Something ranking, so they must keep their meaning.
 *
 * Durable items are therefore **never** held in {@link BasketState.items}; they are derived from the
 * server on read. See `useBasketItems` / `useBasketToggle` in `hooks/useBasket.ts`.
 */
export const DURABLE_KINDS: ReadonlySet<BasketKind> = new Set<BasketKind>([
  "vocab",
  "lesson-vocab",
  "grammar-note",
  "resource",
]);

/** True when a kind's membership lives on the server rather than in this store. */
export function isDurableKind(kind: BasketKind): boolean {
  return DURABLE_KINDS.has(kind);
}

/**
 * Where a sentence snapshot came from, so an item can be acted on without guessing.
 *
 * Reuses the unified {@link SentenceKind} contract (`bank` / `mine` / `practice`) and adds the one
 * source that isn't a `sentences` row at all: an AI lesson's own source sentences.
 */
export type BasketSource = SentenceKind | "ai-lesson";

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
  /**
   * Which table the id belongs to. Absent on items persisted before this field existed, which is
   * treated as "unknown" — the shadowing-list door skips those rather than storing an id that would
   * never resolve.
   */
  source?: BasketSource;
}

/** A vocabulary entry kept in the basket (standalone bank vocab or AI-lesson vocab). */
export interface BasketVocab {
  /** `vocab` is a bank row (`vocab.starred`); `lesson-vocab` is an AI-lesson row (`ai_lesson_vocab.starred`). */
  kind: "vocab" | "lesson-vocab";
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

/** A grammar *note* kept in the basket — the learner's own cross-lesson write-up, not an AI-lesson row. */
export interface BasketGrammarNote {
  kind: "grammar-note";
  id: string;
  title: string;
  /** Short memory-jogging descriptor telling this usage apart from others, or null. */
  nuance: string | null;
}

/** A bookmark resource kept in the basket; prioritized by the Start Something suggestions. */
export interface BasketResource {
  kind: "resource";
  id: string;
  title: string;
  /** Thumbnail URL (a same-origin proxied path), or null when the bookmark has none. */
  imageUrl: string | null;
}

/** A single basket entry; discriminated by {@link BasketKind}. */
export type BasketItem
  = | BasketSentence
    | BasketVocab
    | BasketGrammar
    | BasketGrammarNote
    | BasketResource;

/**
 * Stable membership key for a basket item. Standalone and AI-lesson ids come from different tables, so
 * the id is only unique *within* a kind — prefix with the kind to key a mixed basket without collisions.
 */
export function basketKey(kind: BasketKind, id: string): string {
  return `${kind}:${id}`;
}

interface BasketState {
  /** The collected *ephemeral* items, in insertion order. Durable kinds live on the server. */
  items: BasketItem[];
  /** Whether the overlay is expanded (vs. the collapsed pill). */
  expanded: boolean;
  /** Add an item; a no-op when an item with the same {@link basketKey} is already present. */
  add: (item: BasketItem) => void;
  /** Remove the item with the given {@link basketKey}. */
  remove: (key: string) => void;
  /** Empty the basket of its ephemeral items. */
  clear: () => void;
  /** Expand or collapse the overlay. */
  setExpanded: (on: boolean) => void;
}

/**
 * The basket: the app's one "collect things while browsing" surface, holding model sentences, target
 * vocab, grammar constructions and notes, and bookmark resources.
 *
 * This store keeps the *ephemeral* half — snapshots that exist nowhere else — persisted via Zustand's
 * `persist` middleware (mirroring {@link useDisplayStore}) so they survive reloads; localStorage access
 * is guarded so private-mode / non-browser environments fall back to an empty basket. The
 * {@link DURABLE_KINDS} half is server state and is merged in by `useBasketItems`.
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
      version: 2,
      // v1 kept bank vocab as local snapshots. Vocab is now server-derived (`vocab.starred`), so those
      // rows would render a second, un-removable time beside the real ones — drop them. Sentences and
      // AI-lesson grammar patterns have no durable home and carry over untouched.
      migrate: (persisted, version) => {
        const state = {
          ...(persisted as Record<string, unknown>),
        };
        if (version < 2 && Array.isArray(state.items)) {
          state.items = (state.items as BasketItem[]).filter(i => !isDurableKind(i.kind));
        }
        return state as unknown as BasketState;
      },
      // The collapsed/expanded chrome state shouldn't be restored — always start collapsed on load.
      partialize: state => ({
        items: state.items,
      }),
    },
  ),
);
