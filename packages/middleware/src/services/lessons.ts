import type {
  CategoryItem,
  CultureItem,
  GrammarItem,
  IconKey,
  LessonContent,
  LessonDetail,
  LessonImportInput,
  LessonRecord,
  LessonSummary,
  SentenceTermRef,
  SourceSentenceItem,
  VocabItem,
  VocabRenshuuUpdate,
} from "@sentence-bank/types";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  lessonCategories,
  lessonCulture,
  lessonGrammar,
  lessons,
  lessonSourceSentences,
  lessonVocab,
  type LessonCategoryRow,
  type LessonCultureRow,
  type LessonGrammarRow,
  type LessonRow,
  type LessonSourceSentenceRow,
  type LessonVocabRow,
} from "@/db/schema";

/** Thrown when an imported lesson reuses an existing slug. Routes map this to HTTP 409. */
export class LessonSlugConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`A lesson with slug "${slug}" already exists`);
    this.name = "LessonSlugConflictError";
  }
}

/* ── Row → wire mappers ───────────────────────────────────────────────────────────────────── */

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toLessonRecord(row: LessonRow): LessonRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eyebrow: row.eyebrow,
    subtitle: row.subtitle,
    scrollText: row.scrollText,
    footerText: row.footerText,
    targetLevel: row.targetLevel,
    sourceUrl: row.sourceUrl,
    videoUrl: row.videoUrl,
    sourceLabel: row.sourceLabel,
    createdAt: toIso(row.createdAt),
  };
}

function toCategory(row: LessonCategoryRow): CategoryItem {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    key: row.key,
    jp: row.jp,
    en: row.en,
    icon: row.icon as IconKey,
  };
}

function toVocab(row: LessonVocabRow): VocabItem {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    jp: row.jp,
    yomi: row.yomi,
    en: row.en,
    lvl: row.lvl,
    cat: row.cat,
    renshuuAdded: row.renshuuAdded,
    renshuuList: row.renshuuList,
  };
}

function toGrammar(row: LessonGrammarRow): GrammarItem {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    pat: row.pat,
    gloss: row.gloss,
    note: row.note,
    ex: row.examples,
    grammarTerms: row.grammarTerms ?? null,
  };
}

function toSourceSentence(row: LessonSourceSentenceRow): SourceSentenceItem {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    jp: row.jp,
    en: row.en,
    where: row.whereText,
    url: row.url,
    grammar: row.grammar,
    vocab: row.vocab,
    grammarTerms: row.grammarTerms ?? null,
  };
}

function toCulture(row: LessonCultureRow): CultureItem {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    icon: row.icon as IconKey,
    jp: row.jp,
    en: row.en,
    body: row.body,
    terms: row.terms,
  };
}

/* ── Queries ──────────────────────────────────────────────────────────────────────────────── */

/** List lessons (newest first) with per-section counts for the summary cards. */
export async function listLessons(): Promise<LessonSummary[]> {
  const rows = await db.select().from(lessons).orderBy(desc(lessons.createdAt));
  if (rows.length === 0) return [];

  const counts = await loadCounts();
  return rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    targetLevel: row.targetLevel,
    createdAt: toIso(row.createdAt),
    counts: counts.get(row.id) ?? emptyCounts(),
  }));
}

function emptyCounts(): LessonSummary["counts"] {
  return {
    categories: 0,
    vocab: 0,
    grammar: 0,
    source: 0,
    culture: 0,
  };
}

/** One grouped-count query per child table → a map keyed by lessonId. Constant number of queries. */
async function loadCounts(): Promise<Map<string, LessonSummary["counts"]>> {
  const map = new Map<string, LessonSummary["counts"]>();
  const ensure = (id: string) => {
    let c = map.get(id);
    if (!c) {
      c = emptyCounts();
      map.set(id, c);
    }
    return c;
  };
  const n = sql<number>`cast(count(*) as int)`;

  const [cats, voc, gra, src, cul] = await Promise.all([
    db.select({
      lessonId: lessonCategories.lessonId,
      count: n,
    }).from(lessonCategories).groupBy(lessonCategories.lessonId),
    db.select({
      lessonId: lessonVocab.lessonId,
      count: n,
    }).from(lessonVocab).groupBy(lessonVocab.lessonId),
    db.select({
      lessonId: lessonGrammar.lessonId,
      count: n,
    }).from(lessonGrammar).groupBy(lessonGrammar.lessonId),
    db.select({
      lessonId: lessonSourceSentences.lessonId,
      count: n,
    }).from(lessonSourceSentences).groupBy(lessonSourceSentences.lessonId),
    db.select({
      lessonId: lessonCulture.lessonId,
      count: n,
    }).from(lessonCulture).groupBy(lessonCulture.lessonId),
  ]);

  for (const g of cats) ensure(g.lessonId).categories = g.count;
  for (const g of voc) ensure(g.lessonId).vocab = g.count;
  for (const g of gra) ensure(g.lessonId).grammar = g.count;
  for (const g of src) ensure(g.lessonId).source = g.count;
  for (const g of cul) ensure(g.lessonId).culture = g.count;

  return map;
}

/** Fetch one lesson by slug with all children assembled into the render-friendly nested shape. */
export async function getLessonBySlug(slug: string): Promise<LessonDetail | null> {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.slug, slug));
  if (!lesson) return null;
  return assembleDetail(lesson.id, lesson);
}

async function assembleDetail(lessonId: string, lesson: LessonRow): Promise<LessonDetail> {
  const [categories, vocab, grammar, source, culture] = await Promise.all([
    db.select().from(lessonCategories).where(eq(lessonCategories.lessonId, lessonId)).orderBy(asc(lessonCategories.sortOrder)),
    db.select().from(lessonVocab).where(eq(lessonVocab.lessonId, lessonId)).orderBy(asc(lessonVocab.sortOrder)),
    db.select().from(lessonGrammar).where(eq(lessonGrammar.lessonId, lessonId)).orderBy(asc(lessonGrammar.sortOrder)),
    db.select().from(lessonSourceSentences).where(eq(lessonSourceSentences.lessonId, lessonId)).orderBy(asc(lessonSourceSentences.sortOrder)),
    db.select().from(lessonCulture).where(eq(lessonCulture.lessonId, lessonId)).orderBy(asc(lessonCulture.sortOrder)),
  ]);

  return {
    ...toLessonRecord(lesson),
    categories: categories.map(toCategory),
    vocab: vocab.map(toVocab),
    grammar: grammar.map(toGrammar),
    source: source.map(toSourceSentence),
    culture: culture.map(toCulture),
  };
}

/** Insert a lesson and all children in one transaction. Throws LessonSlugConflictError on a dup slug. */
export async function createLessonFromImport(input: LessonImportInput): Promise<LessonDetail> {
  const lesson = await db.transaction(async (tx) => {
    const [dup] = await tx.select({
      id: lessons.id,
    }).from(lessons).where(eq(lessons.slug, input.slug));
    if (dup) throw new LessonSlugConflictError(input.slug);

    const [inserted] = await tx
      .insert(lessons)
      .values({
        slug: input.slug,
        title: input.title,
        eyebrow: input.eyebrow,
        subtitle: input.subtitle,
        scrollText: input.scrollText,
        footerText: input.footerText,
        targetLevel: input.targetLevel,
        sourceUrl: input.sourceUrl ?? null,
        videoUrl: input.videoUrl ?? null,
        sourceLabel: input.sourceLabel ?? null,
      })
      .returning();
    const lessonId = inserted.id;

    if (input.categories.length > 0) {
      await tx.insert(lessonCategories).values(
        input.categories.map((c, i) => ({
          lessonId,
          key: c.key,
          jp: c.jp,
          en: c.en,
          icon: c.icon,
          sortOrder: i,
        })),
      );
    }
    if (input.vocab.length > 0) {
      await tx.insert(lessonVocab).values(
        input.vocab.map((v, i) => ({
          lessonId,
          jp: v.jp,
          yomi: v.yomi,
          en: v.en,
          lvl: v.lvl,
          cat: v.cat,
          sortOrder: i,
        })),
      );
    }
    if (input.grammar.length > 0) {
      await tx.insert(lessonGrammar).values(
        input.grammar.map((g, i) => ({
          lessonId,
          pat: g.pat,
          gloss: g.gloss,
          note: g.note,
          examples: g.ex,
          sortOrder: i,
        })),
      );
    }
    if (input.source.length > 0) {
      await tx.insert(lessonSourceSentences).values(
        input.source.map((s, i) => ({
          lessonId,
          jp: s.jp,
          en: s.en,
          whereText: s.where,
          url: s.url ?? null,
          grammar: s.grammar,
          vocab: s.vocab,
          sortOrder: i,
        })),
      );
    }
    if (input.culture.length > 0) {
      await tx.insert(lessonCulture).values(
        input.culture.map((c, i) => ({
          lessonId,
          icon: c.icon,
          jp: c.jp,
          en: c.en,
          body: c.body,
          terms: c.terms,
          sortOrder: i,
        })),
      );
    }

    return inserted;
  });

  // Re-read with real ids + persisted order for the response.
  return assembleDetail(lesson.id, lesson);
}

/** Update a vocab item's Renshuu annotation. Returns the updated item, or null if no such id. */
export async function updateVocabRenshuu(
  id: string,
  patch: VocabRenshuuUpdate,
): Promise<VocabItem | null> {
  const set: Partial<{ renshuuAdded: boolean;
    renshuuList: string | null; }> = {};
  if (patch.renshuuAdded !== undefined) set.renshuuAdded = patch.renshuuAdded;
  if (patch.renshuuList !== undefined) set.renshuuList = patch.renshuuList;
  if (Object.keys(set).length === 0) {
    const [row] = await db.select().from(lessonVocab).where(eq(lessonVocab.id, id));
    return row ? toVocab(row) : null;
  }
  const [row] = await db.update(lessonVocab).set(set).where(eq(lessonVocab.id, id)).returning();
  return row ? toVocab(row) : null;
}

/** Set the Grammar source tags on a lesson grammar item. Returns the updated item, or null if no such id. */
export async function updateLessonGrammarTerms(
  id: string,
  grammarTerms: SentenceTermRef[] | null,
): Promise<GrammarItem | null> {
  const [row] = await db
    .update(lessonGrammar)
    .set({
      grammarTerms: grammarTerms ?? null,
    })
    .where(eq(lessonGrammar.id, id))
    .returning();
  return row ? toGrammar(row) : null;
}

/** Set the Grammar source tags on a lesson source sentence. Returns the updated item, or null if no such id. */
export async function updateSourceSentenceTerms(
  id: string,
  grammarTerms: SentenceTermRef[] | null,
): Promise<SourceSentenceItem | null> {
  const [row] = await db
    .update(lessonSourceSentences)
    .set({
      grammarTerms: grammarTerms ?? null,
    })
    .where(eq(lessonSourceSentences.id, id))
    .returning();
  return row ? toSourceSentence(row) : null;
}

/** Delete a lesson (children cascade). Returns false if no such id. */
export async function deleteLesson(id: string): Promise<boolean> {
  const rows = await db.delete(lessons).where(eq(lessons.id, id)).returning({
    id: lessons.id,
  });
  return rows.length > 0;
}

/**
 * All lesson content flattened across lessons for the global browse pages. Each item is tagged with
 * its lesson's slug + title. Ordered by lesson (newest first) then the item's authored order.
 */
export async function getLessonContent(): Promise<LessonContent> {
  const lessonCols = {
    lessonSlug: lessons.slug,
    lessonTitle: lessons.title,
  };

  const [vocab, culture, grammar, source] = await Promise.all([
    db
      .select({
        row: lessonVocab,
        ...lessonCols,
      })
      .from(lessonVocab)
      .innerJoin(lessons, eq(lessonVocab.lessonId, lessons.id))
      .orderBy(desc(lessons.createdAt), asc(lessonVocab.sortOrder)),
    db
      .select({
        row: lessonCulture,
        ...lessonCols,
      })
      .from(lessonCulture)
      .innerJoin(lessons, eq(lessonCulture.lessonId, lessons.id))
      .orderBy(desc(lessons.createdAt), asc(lessonCulture.sortOrder)),
    db
      .select({
        row: lessonGrammar,
        ...lessonCols,
      })
      .from(lessonGrammar)
      .innerJoin(lessons, eq(lessonGrammar.lessonId, lessons.id))
      .orderBy(desc(lessons.createdAt), asc(lessonGrammar.sortOrder)),
    db
      .select({
        row: lessonSourceSentences,
        ...lessonCols,
      })
      .from(lessonSourceSentences)
      .innerJoin(lessons, eq(lessonSourceSentences.lessonId, lessons.id))
      .orderBy(desc(lessons.createdAt), asc(lessonSourceSentences.sortOrder)),
  ]);

  return {
    vocab: vocab.map(r => ({
      ...toVocab(r.row),
      lessonSlug: r.lessonSlug,
      lessonTitle: r.lessonTitle,
    })),
    culture: culture.map(r => ({
      ...toCulture(r.row),
      lessonSlug: r.lessonSlug,
      lessonTitle: r.lessonTitle,
    })),
    grammar: grammar.map(r => ({
      ...toGrammar(r.row),
      lessonSlug: r.lessonSlug,
      lessonTitle: r.lessonTitle,
    })),
    sentences: source.map(r => ({
      ...toSourceSentence(r.row),
      lessonSlug: r.lessonSlug,
      lessonTitle: r.lessonTitle,
    })),
  };
}
