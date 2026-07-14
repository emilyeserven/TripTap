import type {
  AiLessonContent,
  AiLessonDetail,
  AiLessonImportInput,
  AiLessonRecord,
  AiLessonSummary,
  CategoryItem,
  CultureItem,
  GrammarItem,
  IconKey,
  SentenceTermRef,
  SourceSentenceItem,
  VocabItem,
  VocabRenshuuUpdate,
} from "@sentence-bank/types";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiLessonCategories,
  aiLessonCulture,
  aiLessonGrammar,
  aiLessons,
  aiLessonSourceSentences,
  aiLessonVocab,
  type AiLessonCategoryRow,
  type AiLessonCultureRow,
  type AiLessonGrammarRow,
  type AiLessonRow,
  type AiLessonSourceSentenceRow,
  type AiLessonVocabRow,
} from "@/db/schema";

/** Thrown when an imported AI Lesson reuses an existing slug. Routes map this to HTTP 409. */
export class AiLessonSlugConflictError extends Error {
  constructor(public readonly slug: string) {
    super(`An AI Lesson with slug "${slug}" already exists`);
    this.name = "AiLessonSlugConflictError";
  }
}

/* ── Row → wire mappers ───────────────────────────────────────────────────────────────────── */

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toAiLessonRecord(row: AiLessonRow): AiLessonRecord {
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

function toCategory(row: AiLessonCategoryRow): CategoryItem {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    key: row.key,
    jp: row.jp,
    en: row.en,
    icon: row.icon as IconKey,
  };
}

function toVocab(row: AiLessonVocabRow): VocabItem {
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

function toGrammar(row: AiLessonGrammarRow): GrammarItem {
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

function toSourceSentence(row: AiLessonSourceSentenceRow): SourceSentenceItem {
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

function toCulture(row: AiLessonCultureRow): CultureItem {
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

/** List AI Lessons (newest first) with per-section counts for the summary cards. */
export async function listAiLessons(): Promise<AiLessonSummary[]> {
  const rows = await db.select().from(aiLessons).orderBy(desc(aiLessons.createdAt));
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

function emptyCounts(): AiLessonSummary["counts"] {
  return {
    categories: 0,
    vocab: 0,
    grammar: 0,
    source: 0,
    culture: 0,
  };
}

/** One grouped-count query per child table → a map keyed by aiLessonId. Constant number of queries. */
async function loadCounts(): Promise<Map<string, AiLessonSummary["counts"]>> {
  const map = new Map<string, AiLessonSummary["counts"]>();
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
      aiLessonId: aiLessonCategories.aiLessonId,
      count: n,
    }).from(aiLessonCategories).groupBy(aiLessonCategories.aiLessonId),
    db.select({
      aiLessonId: aiLessonVocab.aiLessonId,
      count: n,
    }).from(aiLessonVocab).groupBy(aiLessonVocab.aiLessonId),
    db.select({
      aiLessonId: aiLessonGrammar.aiLessonId,
      count: n,
    }).from(aiLessonGrammar).groupBy(aiLessonGrammar.aiLessonId),
    db.select({
      aiLessonId: aiLessonSourceSentences.aiLessonId,
      count: n,
    }).from(aiLessonSourceSentences).groupBy(aiLessonSourceSentences.aiLessonId),
    db.select({
      aiLessonId: aiLessonCulture.aiLessonId,
      count: n,
    }).from(aiLessonCulture).groupBy(aiLessonCulture.aiLessonId),
  ]);

  for (const g of cats) ensure(g.aiLessonId).categories = g.count;
  for (const g of voc) ensure(g.aiLessonId).vocab = g.count;
  for (const g of gra) ensure(g.aiLessonId).grammar = g.count;
  for (const g of src) ensure(g.aiLessonId).source = g.count;
  for (const g of cul) ensure(g.aiLessonId).culture = g.count;

  return map;
}

/** Fetch one AI Lesson by slug with all children assembled into the render-friendly nested shape. */
export async function getAiLessonBySlug(slug: string): Promise<AiLessonDetail | null> {
  const [lesson] = await db.select().from(aiLessons).where(eq(aiLessons.slug, slug));
  if (!lesson) return null;
  return assembleDetail(lesson.id, lesson);
}

async function assembleDetail(aiLessonId: string, lesson: AiLessonRow): Promise<AiLessonDetail> {
  const [categories, vocab, grammar, source, culture] = await Promise.all([
    db.select().from(aiLessonCategories).where(eq(aiLessonCategories.aiLessonId, aiLessonId)).orderBy(asc(aiLessonCategories.sortOrder)),
    db.select().from(aiLessonVocab).where(eq(aiLessonVocab.aiLessonId, aiLessonId)).orderBy(asc(aiLessonVocab.sortOrder)),
    db.select().from(aiLessonGrammar).where(eq(aiLessonGrammar.aiLessonId, aiLessonId)).orderBy(asc(aiLessonGrammar.sortOrder)),
    db.select().from(aiLessonSourceSentences).where(eq(aiLessonSourceSentences.aiLessonId, aiLessonId)).orderBy(asc(aiLessonSourceSentences.sortOrder)),
    db.select().from(aiLessonCulture).where(eq(aiLessonCulture.aiLessonId, aiLessonId)).orderBy(asc(aiLessonCulture.sortOrder)),
  ]);

  return {
    ...toAiLessonRecord(lesson),
    categories: categories.map(toCategory),
    vocab: vocab.map(toVocab),
    grammar: grammar.map(toGrammar),
    source: source.map(toSourceSentence),
    culture: culture.map(toCulture),
  };
}

/** Insert an AI Lesson and all children in one transaction. Throws AiLessonSlugConflictError on a dup slug. */
export async function createAiLessonFromImport(input: AiLessonImportInput): Promise<AiLessonDetail> {
  const lesson = await db.transaction(async (tx) => {
    const [dup] = await tx.select({
      id: aiLessons.id,
    }).from(aiLessons).where(eq(aiLessons.slug, input.slug));
    if (dup) throw new AiLessonSlugConflictError(input.slug);

    const [inserted] = await tx
      .insert(aiLessons)
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
    const aiLessonId = inserted.id;

    if (input.categories.length > 0) {
      await tx.insert(aiLessonCategories).values(
        input.categories.map((c, i) => ({
          aiLessonId,
          key: c.key,
          jp: c.jp,
          en: c.en,
          icon: c.icon,
          sortOrder: i,
        })),
      );
    }
    if (input.vocab.length > 0) {
      await tx.insert(aiLessonVocab).values(
        input.vocab.map((v, i) => ({
          aiLessonId,
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
      await tx.insert(aiLessonGrammar).values(
        input.grammar.map((g, i) => ({
          aiLessonId,
          pat: g.pat,
          gloss: g.gloss,
          note: g.note,
          examples: g.ex,
          sortOrder: i,
        })),
      );
    }
    if (input.source.length > 0) {
      await tx.insert(aiLessonSourceSentences).values(
        input.source.map((s, i) => ({
          aiLessonId,
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
      await tx.insert(aiLessonCulture).values(
        input.culture.map((c, i) => ({
          aiLessonId,
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
    const [row] = await db.select().from(aiLessonVocab).where(eq(aiLessonVocab.id, id));
    return row ? toVocab(row) : null;
  }
  const [row] = await db.update(aiLessonVocab).set(set).where(eq(aiLessonVocab.id, id)).returning();
  return row ? toVocab(row) : null;
}

/** Set the Grammar source tags on an AI Lesson grammar item. Returns the updated item, or null if no such id. */
export async function updateAiLessonGrammarTerms(
  id: string,
  grammarTerms: SentenceTermRef[] | null,
): Promise<GrammarItem | null> {
  const [row] = await db
    .update(aiLessonGrammar)
    .set({
      grammarTerms: grammarTerms ?? null,
    })
    .where(eq(aiLessonGrammar.id, id))
    .returning();
  return row ? toGrammar(row) : null;
}

/** Set the Grammar source tags on an AI Lesson source sentence. Returns the updated item, or null if no such id. */
export async function updateSourceSentenceTerms(
  id: string,
  grammarTerms: SentenceTermRef[] | null,
): Promise<SourceSentenceItem | null> {
  const [row] = await db
    .update(aiLessonSourceSentences)
    .set({
      grammarTerms: grammarTerms ?? null,
    })
    .where(eq(aiLessonSourceSentences.id, id))
    .returning();
  return row ? toSourceSentence(row) : null;
}

/** Delete an AI Lesson (children cascade). Returns false if no such id. */
export async function deleteAiLesson(id: string): Promise<boolean> {
  const rows = await db.delete(aiLessons).where(eq(aiLessons.id, id)).returning({
    id: aiLessons.id,
  });
  return rows.length > 0;
}

/**
 * All AI Lesson content flattened across AI Lessons for the global browse pages. Each item is tagged
 * with its AI Lesson's slug + title. Ordered by AI Lesson (newest first) then the item's authored order.
 */
export async function getAiLessonContent(): Promise<AiLessonContent> {
  const aiLessonCols = {
    aiLessonSlug: aiLessons.slug,
    aiLessonTitle: aiLessons.title,
  };

  const [vocab, culture, grammar, source] = await Promise.all([
    db
      .select({
        row: aiLessonVocab,
        ...aiLessonCols,
      })
      .from(aiLessonVocab)
      .innerJoin(aiLessons, eq(aiLessonVocab.aiLessonId, aiLessons.id))
      .orderBy(desc(aiLessons.createdAt), asc(aiLessonVocab.sortOrder)),
    db
      .select({
        row: aiLessonCulture,
        ...aiLessonCols,
      })
      .from(aiLessonCulture)
      .innerJoin(aiLessons, eq(aiLessonCulture.aiLessonId, aiLessons.id))
      .orderBy(desc(aiLessons.createdAt), asc(aiLessonCulture.sortOrder)),
    db
      .select({
        row: aiLessonGrammar,
        ...aiLessonCols,
      })
      .from(aiLessonGrammar)
      .innerJoin(aiLessons, eq(aiLessonGrammar.aiLessonId, aiLessons.id))
      .orderBy(desc(aiLessons.createdAt), asc(aiLessonGrammar.sortOrder)),
    db
      .select({
        row: aiLessonSourceSentences,
        ...aiLessonCols,
      })
      .from(aiLessonSourceSentences)
      .innerJoin(aiLessons, eq(aiLessonSourceSentences.aiLessonId, aiLessons.id))
      .orderBy(desc(aiLessons.createdAt), asc(aiLessonSourceSentences.sortOrder)),
  ]);

  return {
    vocab: vocab.map(r => ({
      ...toVocab(r.row),
      aiLessonSlug: r.aiLessonSlug,
      aiLessonTitle: r.aiLessonTitle,
    })),
    culture: culture.map(r => ({
      ...toCulture(r.row),
      aiLessonSlug: r.aiLessonSlug,
      aiLessonTitle: r.aiLessonTitle,
    })),
    grammar: grammar.map(r => ({
      ...toGrammar(r.row),
      aiLessonSlug: r.aiLessonSlug,
      aiLessonTitle: r.aiLessonTitle,
    })),
    sentences: source.map(r => ({
      ...toSourceSentence(r.row),
      aiLessonSlug: r.aiLessonSlug,
      aiLessonTitle: r.aiLessonTitle,
    })),
  };
}
