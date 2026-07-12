import type { FastifyInstance } from "fastify";
import type { CreateSentenceInput, UpdateSentenceInput } from "@sentence-bank/types";
import { getVocabForSentence, setVocabForSentence } from "@/services/sentence-vocab";
import {
  backfillFurigana,
  createSentence,
  createSentencesMany,
  deleteSentence,
  getSentence,
  listSentences,
  regenerateSentenceFurigana,
  updateSentence,
} from "@/services/sentences";

const sentenceParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const createSentenceBody = {
  type: "object",
  required: ["text", "language"],
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      minLength: 1,
    },
    translation: {
      type: ["string", "null"],
    },
    language: {
      type: "string",
      minLength: 1,
    },
    source: {
      type: ["string", "null"],
    },
    sourceId: {
      type: ["string", "null"],
      format: "uuid",
    },
    page: {
      type: ["string", "null"],
    },
    notes: {
      type: ["string", "null"],
    },
    tags: {
      type: ["string", "null"],
    },
    terms: {
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
    captureId: {
      type: ["string", "null"],
      format: "uuid",
    },
    vocabIds: {
      type: "array",
      items: {
        type: "string",
        format: "uuid",
      },
    },
  },
} as const;

const readingSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["t", "r"],
    properties: {
      t: {
        type: "string",
      },
      r: {
        type: ["string", "null"],
      },
    },
  },
} as const;

const updateSentenceBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createSentenceBody.properties,
    // A manual furigana override (clears/edits the generated reading).
    reading: readingSchema,
  },
} as const;

const bulkSentencesBody = {
  type: "object",
  required: ["sentences"],
  additionalProperties: false,
  properties: {
    sentences: {
      type: "array",
      items: createSentenceBody,
    },
  },
} as const;

const setVocabBody = {
  type: "object",
  required: ["vocabIds"],
  additionalProperties: false,
  properties: {
    vocabIds: {
      type: "array",
      items: {
        type: "string",
        format: "uuid",
      },
    },
  },
} as const;

/** CRUD routes for sentences, mounted under `/api/sentences`. */
export async function sentenceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/sentences", {
    schema: {
      tags: ["sentences"],
    },
  }, async () => listSentences());

  app.get("/api/sentences/:id", {
    schema: {
      tags: ["sentences"],
      params: sentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const sentence = await getSentence(id);
    if (!sentence) return reply.code(404).send({
      message: "Sentence not found",
    });
    return sentence;
  });

  app.post("/api/sentences", {
    schema: {
      tags: ["sentences"],
      body: createSentenceBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateSentenceInput;
    const sentence = await createSentence(input);
    return reply.code(201).send(sentence);
  });

  app.post("/api/sentences/bulk", {
    schema: {
      tags: ["sentences"],
      body: bulkSentencesBody,
    },
  }, async (req, reply) => {
    const {
      sentences: inputs,
    } = req.body as { sentences: CreateSentenceInput[] };
    const created = await createSentencesMany(inputs);
    return reply.code(201).send(created);
  });

  app.post("/api/sentences/furigana/backfill", {
    schema: {
      tags: ["sentences"],
    },
  }, async () => backfillFurigana());

  app.post("/api/sentences/:id/furigana", {
    schema: {
      tags: ["sentences"],
      params: sentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const sentence = await regenerateSentenceFurigana(id);
    if (!sentence) return reply.code(404).send({
      message: "Sentence not found",
    });
    return sentence;
  });

  app.get("/api/sentences/:id/vocab", {
    schema: {
      tags: ["sentences"],
      params: sentenceParams,
    },
  }, async (req) => {
    const {
      id,
    } = req.params as { id: string };
    return getVocabForSentence(id);
  });

  app.put("/api/sentences/:id/vocab", {
    schema: {
      tags: ["sentences"],
      params: sentenceParams,
      body: setVocabBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const {
      vocabIds,
    } = req.body as { vocabIds: string[] };
    const linked = await setVocabForSentence(id, vocabIds);
    if (!linked) return reply.code(404).send({
      message: "Sentence not found",
    });
    return linked;
  });

  app.patch(
    "/api/sentences/:id",
    {
      schema: {
        tags: ["sentences"],
        params: sentenceParams,
        body: updateSentenceBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const sentence = await updateSentence(id, req.body as UpdateSentenceInput);
      if (!sentence) return reply.code(404).send({
        message: "Sentence not found",
      });
      return sentence;
    },
  );

  app.delete("/api/sentences/:id", {
    schema: {
      tags: ["sentences"],
      params: sentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteSentence(id);
    if (!deleted) return reply.code(404).send({
      message: "Sentence not found",
    });
    return reply.code(204).send();
  });
}
