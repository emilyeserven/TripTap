import type { FastifyInstance } from "fastify";
import { lessonImportJsonSchema, type LessonImportInput } from "@sentence-bank/types";
import type { GrammarTermsUpdate, VocabRenshuuUpdate } from "@sentence-bank/types";
import {
  createLessonFromImport,
  deleteLesson,
  getLessonBySlug,
  getLessonContent,
  LessonSlugConflictError,
  listLessons,
  updateLessonGrammarTerms,
  updateSourceSentenceTerms,
  updateVocabRenshuu,
} from "@/services/lessons";

const slugParams = {
  type: "object",
  required: ["slug"],
  properties: {
    slug: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

const idParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const vocabRenshuuBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    renshuuAdded: {
      type: "boolean",
    },
    renshuuList: {
      type: ["string", "null"],
    },
  },
} as const;

const grammarTermsBody = {
  type: "object",
  additionalProperties: false,
  required: ["grammarTerms"],
  properties: {
    grammarTerms: {
      type: ["array", "null"],
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "kind", "sourceId", "sourceLabel"],
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
          },
          kind: {
            type: "string",
            enum: ["tag", "taxonomy"],
          },
          sourceId: {
            type: "string",
          },
          sourceLabel: {
            type: "string",
          },
          category: {
            type: "string",
            enum: ["vocabulary", "grammar", "general", "resource", "listening"],
          },
        },
      },
    },
  },
} as const;

/** Lesson import + viewing routes, mounted under `/api/lessons`. */
export async function lessonRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/lessons", {
    schema: {
      tags: ["lessons"],
    },
  }, async () => listLessons());

  // All lesson content flattened across lessons (for the global Culture/Vocab/Grammar/Sentences pages).
  app.get("/api/lesson-content", {
    schema: {
      tags: ["lessons"],
    },
  }, async () => getLessonContent());

  app.get("/api/lessons/:slug", {
    schema: {
      tags: ["lessons"],
      params: slugParams,
    },
  }, async (req, reply) => {
    const {
      slug,
    } = req.params as { slug: string };
    const lesson = await getLessonBySlug(slug);
    if (!lesson) return reply.code(404).send({
      message: "Lesson not found",
    });
    return lesson;
  });

  app.post("/api/lessons/import", {
    schema: {
      tags: ["lessons"],
      body: lessonImportJsonSchema,
    },
  }, async (req, reply) => {
    try {
      const detail = await createLessonFromImport(req.body as LessonImportInput);
      return reply.code(201).send(detail);
    }
    catch (err) {
      if (err instanceof LessonSlugConflictError) {
        return reply.code(409).send({
          message: err.message,
        });
      }
      throw err;
    }
  });

  // Update a vocab item's Renshuu annotation.
  app.patch("/api/lesson-vocab/:id", {
    schema: {
      tags: ["lessons"],
      params: idParams,
      body: vocabRenshuuBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateVocabRenshuu(id, req.body as VocabRenshuuUpdate);
    if (!updated) return reply.code(404).send({
      message: "Vocab item not found",
    });
    return updated;
  });

  // Set the Grammar source tags on a grammar item.
  app.patch("/api/lesson-grammar/:id", {
    schema: {
      tags: ["lessons"],
      params: idParams,
      body: grammarTermsBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const {
      grammarTerms,
    } = req.body as GrammarTermsUpdate;
    const updated = await updateLessonGrammarTerms(id, grammarTerms);
    if (!updated) return reply.code(404).send({
      message: "Grammar item not found",
    });
    return updated;
  });

  // Set the Grammar source tags on a source sentence.
  app.patch("/api/lesson-source-sentences/:id", {
    schema: {
      tags: ["lessons"],
      params: idParams,
      body: grammarTermsBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const {
      grammarTerms,
    } = req.body as GrammarTermsUpdate;
    const updated = await updateSourceSentenceTerms(id, grammarTerms);
    if (!updated) return reply.code(404).send({
      message: "Source sentence not found",
    });
    return updated;
  });

  app.delete("/api/lessons/:id", {
    schema: {
      tags: ["lessons"],
      params: idParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteLesson(id);
    if (!deleted) return reply.code(404).send({
      message: "Lesson not found",
    });
    return reply.code(204).send();
  });
}
