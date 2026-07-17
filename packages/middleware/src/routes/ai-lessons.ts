import type { FastifyInstance } from "fastify";
import { aiLessonImportJsonSchema, type AiLessonImportInput } from "@sentence-bank/types";
import type { GrammarTermsUpdate, VocabRenshuuUpdate } from "@sentence-bank/types";
import {
  AiLessonSlugConflictError,
  createAiLessonFromImport,
  deleteAiLesson,
  getAiLessonBySlug,
  getAiLessonContent,
  listAiLessons,
  updateAiLessonGrammarTerms,
  updateSourceSentenceTerms,
  updateVocabRenshuu,
} from "@/services/ai-lessons";

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
            enum: ["vocabulary", "grammar", "general", "resource"],
          },
        },
      },
    },
  },
} as const;

/** AI Lesson import + viewing routes, mounted under `/api/ai-lessons`. */
export async function aiLessonRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/ai-lessons", {
    schema: {
      tags: ["ai-lessons"],
    },
  }, async () => listAiLessons());

  // All AI Lesson content flattened across AI Lessons (for the global Culture/Vocab/Grammar/Sentences pages).
  app.get("/api/ai-lesson-content", {
    schema: {
      tags: ["ai-lessons"],
    },
  }, async () => getAiLessonContent());

  app.get("/api/ai-lessons/:slug", {
    schema: {
      tags: ["ai-lessons"],
      params: slugParams,
    },
  }, async (req, reply) => {
    const {
      slug,
    } = req.params as { slug: string };
    const lesson = await getAiLessonBySlug(slug);
    if (!lesson) return reply.code(404).send({
      message: "AI Lesson not found",
    });
    return lesson;
  });

  app.post("/api/ai-lessons/import", {
    schema: {
      tags: ["ai-lessons"],
      body: aiLessonImportJsonSchema,
    },
  }, async (req, reply) => {
    try {
      const detail = await createAiLessonFromImport(req.body as AiLessonImportInput);
      return reply.code(201).send(detail);
    }
    catch (err) {
      if (err instanceof AiLessonSlugConflictError) {
        return reply.code(409).send({
          message: err.message,
        });
      }
      throw err;
    }
  });

  // Update a vocab item's Renshuu annotation.
  app.patch("/api/ai-lesson-vocab/:id", {
    schema: {
      tags: ["ai-lessons"],
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
  app.patch("/api/ai-lesson-grammar/:id", {
    schema: {
      tags: ["ai-lessons"],
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
    const updated = await updateAiLessonGrammarTerms(id, grammarTerms);
    if (!updated) return reply.code(404).send({
      message: "Grammar item not found",
    });
    return updated;
  });

  // Set the Grammar source tags on a source sentence.
  app.patch("/api/ai-lesson-source-sentences/:id", {
    schema: {
      tags: ["ai-lessons"],
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

  app.delete("/api/ai-lessons/:id", {
    schema: {
      tags: ["ai-lessons"],
      params: idParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteAiLesson(id);
    if (!deleted) return reply.code(404).send({
      message: "AI Lesson not found",
    });
    return reply.code(204).send();
  });
}
