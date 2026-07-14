import type { Vocab, VocabItem } from "@sentence-bank/types";

/**
 * Adapts a standalone {@link Vocab} entry into the AI Lesson {@link VocabItem} shape so it can be
 * rendered by the flip-card `VocabCard`. Standalone vocab has no level/category/Renshuu data, so
 * those fields are left empty — `LevelBadge` hides an empty `lvl`, and an omitted `onRenshuuChange`
 * plus `renshuuAdded: false` keeps the Renshuu footer from rendering.
 */
export function vocabToCardItem(v: Vocab): VocabItem {
  return {
    id: v.id,
    jp: v.term,
    yomi: v.reading ?? "",
    en: v.meaning ?? "",
    lvl: "",
    cat: "",
    sortOrder: 0,
    renshuuAdded: false,
    renshuuList: null,
  };
}
