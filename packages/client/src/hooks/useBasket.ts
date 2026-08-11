import type {
  BasketGrammarNote,
  BasketItem,
  BasketResource,
  BasketVocab,
} from "@/stores/basketStore";

import { useCallback, useMemo } from "react";

import { useAiLessonContent, useUpdateVocabRenshuu } from "@/hooks/useAiLessons";
import { useBookmarkResources } from "@/hooks/useBookmarks";
import { useGrammarNotes, useUpdateGrammarNote } from "@/hooks/useGrammarNotes";
import { useStartSettings, useUpdateStartSettings } from "@/hooks/useSettings";
import { useUpdateVocab, useVocab } from "@/hooks/useVocab";
import { basketKey, isDurableKind, useBasketStore } from "@/stores/basketStore";

/**
 * The basket's server half: the items whose membership is a durable flag rather than a local snapshot.
 *
 * Derived on read from the queries that already exist, so there is nothing to keep in sync — the flag
 * *is* the membership. Ordering is stable (vocab, AI-lesson vocab, grammar notes, resources) so the
 * overlay doesn't reshuffle between renders.
 */
function useDurableBasketItems(): BasketItem[] {
  const {
    data: bankVocab,
  } = useVocab();
  const {
    data: aiContent,
  } = useAiLessonContent();
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  const {
    data: startSettings,
  } = useStartSettings();

  const favoriteResourceIds = startSettings?.favoriteResourceIds;

  // Naming a resource needs the remote bookmarks list, which is slow and refetches on focus. This hook
  // runs on every page (the overlay is global), so only ask for it once there's a resource to name.
  const {
    data: resourceList,
  } = useBookmarkResources((favoriteResourceIds?.length ?? 0) > 0);
  const resources = resourceList?.resources;

  return useMemo(() => {
    const vocab: BasketVocab[] = (bankVocab ?? [])
      .filter(v => v.starred)
      .map(v => ({
        kind: "vocab",
        id: v.id,
        term: v.term,
        reading: v.reading,
        meaning: v.meaning,
      }));

    const lessonVocab: BasketVocab[] = (aiContent?.vocab ?? [])
      .filter(v => v.starred)
      .map(v => ({
        kind: "lesson-vocab",
        id: v.id,
        term: v.jp,
        reading: v.yomi || null,
        meaning: v.en || null,
      }));

    const notes: BasketGrammarNote[] = (grammarNotes ?? [])
      .filter(n => n.starred)
      .map(n => ({
        kind: "grammar-note",
        id: n.id,
        title: n.title,
        nuance: n.nuance,
      }));

    // Membership is the id list; the title/thumbnail come from the live resource list, which may not
    // have loaded (or may no longer contain the bookmark). Fall back to the id so a row never vanishes
    // silently — the learner can still un-basket it.
    const byId = new Map((resources ?? []).map(r => [r.id, r]));
    const basketResources: BasketResource[] = (favoriteResourceIds ?? []).map((id) => {
      const r = byId.get(id);
      return {
        kind: "resource",
        id,
        title: r?.title ?? "Resource",
        imageUrl: r?.imageUrl ?? null,
      };
    });

    return [...vocab, ...lessonVocab, ...notes, ...basketResources];
  }, [bankVocab, aiContent, grammarNotes, favoriteResourceIds, resources]);
}

/**
 * Everything in the basket: the local snapshots plus the server-backed items, in one flat list the
 * overlay can group. Local items come first so a just-added sentence lands where the learner looked.
 */
export function useBasketItems(): BasketItem[] {
  const localItems = useBasketStore(s => s.items);
  const durableItems = useDurableBasketItems();
  return useMemo(() => [...localItems, ...durableItems], [localItems, durableItems]);
}

/** What {@link useBasketToggle} hands a caller. */
export interface BasketToggle {
  inBasket: boolean;
  toggle: () => void;
  /** True while a durable kind's write is in flight; always false for local kinds. */
  pending: boolean;
}

/**
 * Toggle one item's basket membership, whichever half of the basket it belongs to.
 *
 * Local kinds go to the store. Durable kinds go to the endpoint that owns their flag — bank vocab to
 * `PATCH /api/vocab/:id`, AI-lesson vocab to `PATCH /api/ai-lesson-vocab/:id`, grammar notes to
 * `PATCH /api/grammar-notes/:id`, resources to `PATCH /api/settings/start`. Callers don't need to know
 * which; that's the point of routing it here rather than in each card.
 */
export function useBasketToggle(item: BasketItem): BasketToggle {
  const localItems = useBasketStore(s => s.items);
  const add = useBasketStore(s => s.add);
  const remove = useBasketStore(s => s.remove);

  const updateVocab = useUpdateVocab();
  const updateLessonVocab = useUpdateVocabRenshuu();
  const updateGrammarNote = useUpdateGrammarNote();
  const updateStartSettings = useUpdateStartSettings();

  const {
    data: bankVocab,
  } = useVocab();
  const {
    data: aiContent,
  } = useAiLessonContent();
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  const {
    data: startSettings,
  } = useStartSettings();

  const favoriteResourceIds = useMemo(
    () => startSettings?.favoriteResourceIds ?? [],
    [startSettings],
  );

  const key = basketKey(item.kind, item.id);
  const durable = isDurableKind(item.kind);

  let inBasket: boolean;
  switch (item.kind) {
    case "vocab":
      inBasket = (bankVocab ?? []).some(v => v.id === item.id && v.starred);
      break;
    case "lesson-vocab":
      inBasket = (aiContent?.vocab ?? []).some(v => v.id === item.id && v.starred);
      break;
    case "grammar-note":
      inBasket = (grammarNotes ?? []).some(n => n.id === item.id && n.starred);
      break;
    case "resource":
      inBasket = favoriteResourceIds.includes(item.id);
      break;
    default:
      inBasket = localItems.some(i => basketKey(i.kind, i.id) === key);
  }

  const toggle = useCallback(() => {
    switch (item.kind) {
      case "vocab":
        updateVocab.mutate({
          id: item.id,
          input: {
            starred: !inBasket,
          },
        });
        return;
      case "lesson-vocab":
        updateLessonVocab.mutate({
          id: item.id,
          patch: {
            starred: !inBasket,
          },
        });
        return;
      case "grammar-note":
        updateGrammarNote.mutate({
          id: item.id,
          input: {
            starred: !inBasket,
          },
        });
        return;
      case "resource":
        // The endpoint takes the whole list, so this is a read-modify-write; concurrent toggles from
        // two tabs would race, which is the same behaviour the Collections star had.
        updateStartSettings.mutate({
          favoriteResourceIds: inBasket
            ? favoriteResourceIds.filter(id => id !== item.id)
            : [...favoriteResourceIds, item.id],
        });
        return;
      default:
        if (inBasket) remove(key);
        else add(item);
    }
  }, [
    item,
    inBasket,
    key,
    add,
    remove,
    favoriteResourceIds,
    updateVocab,
    updateLessonVocab,
    updateGrammarNote,
    updateStartSettings,
  ]);

  const pending = durable && (
    updateVocab.isPending
    || updateLessonVocab.isPending
    || updateGrammarNote.isPending
    || updateStartSettings.isPending
  );

  return {
    inBasket,
    toggle,
    pending,
  };
}

/**
 * Empty the basket: the local snapshots plus every durable flag currently set. Returns how many
 * durable items were cleared, so the caller can report it.
 */
export function useClearBasket(): {
  clear: () => void;
  /** How many of the basket's items are saved server-side, i.e. how many the clear un-stars. */
  durableCount: number;
} {
  const storeClear = useBasketStore(s => s.clear);
  const durableItems = useDurableBasketItems();

  const updateVocab = useUpdateVocab();
  const updateLessonVocab = useUpdateVocabRenshuu();
  const updateGrammarNote = useUpdateGrammarNote();
  const updateStartSettings = useUpdateStartSettings();

  const clear = useCallback(() => {
    storeClear();
    for (const item of durableItems) {
      switch (item.kind) {
        case "vocab":
          updateVocab.mutate({
            id: item.id,
            input: {
              starred: false,
            },
          });
          break;
        case "lesson-vocab":
          updateLessonVocab.mutate({
            id: item.id,
            patch: {
              starred: false,
            },
          });
          break;
        case "grammar-note":
          updateGrammarNote.mutate({
            id: item.id,
            input: {
              starred: false,
            },
          });
          break;
        default:
          break;
      }
    }
    // Resources are one list, so they clear in a single write rather than per item.
    if (durableItems.some(i => i.kind === "resource")) {
      updateStartSettings.mutate({
        favoriteResourceIds: [],
      });
    }
  }, [
    storeClear,
    durableItems,
    updateVocab,
    updateLessonVocab,
    updateGrammarNote,
    updateStartSettings,
  ]);

  return {
    clear,
    durableCount: durableItems.length,
  };
}
