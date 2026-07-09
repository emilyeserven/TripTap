import type { LessonDetail, LessonImportInput } from "@sentence-bank/types";

/** A minimal, valid import payload (no ids) for paste-box tests. */
export const lessonImportFixture: LessonImportInput = {
  slug: "cafe-basics",
  title: "カフェで注文",
  eyebrow: "Everyday Japanese",
  subtitle: "Ordering drinks and paying.",
  scrollText: "カフェ",
  footerText: "Study aid — example sentences for language learning.",
  targetLevel: "N5",
  sourceUrl: null,
  videoUrl: null,
  sourceLabel: "Examples",
  categories: [{
    key: "drinks",
    jp: "飲み物",
    en: "Drinks",
    icon: "utensils",
  }],
  vocab: [{
    jp: "珈琲",
    yomi: "コーヒー",
    en: "coffee",
    lvl: "N5",
    cat: "drinks",
  }],
  grammar: [
    {
      pat: "〜をください",
      gloss: "Please give me ~",
      note: "Noun + をください is the basic polite request.",
      ex: [{
        jp: "コーヒーをください。",
        en: "A coffee, please.",
      }],
    },
  ],
  source: [
    {
      jp: "ホットコーヒーを一つお願いします。",
      en: "One hot coffee, please.",
      where: "Example",
      grammar: [{
        p: "お願いします",
        d: "'Please' — a polite request.",
      }],
      vocab: [{
        w: "一つ",
        y: "ひとつ",
        m: "one (thing)",
        lvl: "N5",
      }],
    },
  ],
  culture: [
    {
      icon: "utensils",
      jp: "カフェ文化",
      en: "Café culture",
      body: "Ordering at the counter is common; you often pay first.",
      terms: ["珈琲"],
    },
  ],
};

/** The same content assembled as a persisted LessonDetail for viewer/template tests. */
export const lessonDetailFixture: LessonDetail = {
  id: "00000000-0000-0000-0000-000000000001",
  createdAt: "2026-01-01T00:00:00.000Z",
  slug: lessonImportFixture.slug,
  title: lessonImportFixture.title,
  eyebrow: lessonImportFixture.eyebrow,
  subtitle: lessonImportFixture.subtitle,
  scrollText: lessonImportFixture.scrollText,
  footerText: lessonImportFixture.footerText,
  targetLevel: lessonImportFixture.targetLevel,
  sourceUrl: lessonImportFixture.sourceUrl,
  videoUrl: lessonImportFixture.videoUrl,
  sourceLabel: lessonImportFixture.sourceLabel,
  categories: lessonImportFixture.categories.map((c, i) => ({
    ...c,
    id: `cat-${i}`,
    sortOrder: i,
  })),
  vocab: lessonImportFixture.vocab.map((v, i) => ({
    ...v,
    id: `voc-${i}`,
    sortOrder: i,
    renshuuAdded: false,
    renshuuList: null,
  })),
  grammar: lessonImportFixture.grammar.map((g, i) => ({
    ...g,
    id: `gra-${i}`,
    sortOrder: i,
  })),
  source: lessonImportFixture.source.map((s, i) => ({
    ...s,
    id: `src-${i}`,
    sortOrder: i,
    url: s.url ?? null,
  })),
  culture: lessonImportFixture.culture.map((c, i) => ({
    ...c,
    id: `cul-${i}`,
    sortOrder: i,
  })),
};
