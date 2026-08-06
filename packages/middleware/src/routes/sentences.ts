import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import type { CreateSentenceInput, UpdateSentenceInput } from "@sentence-bank/types";
import { idParams } from "@/routes/schemas/params";
import { getVocabForSentence, setVocabForSentence } from "@/services/vocab-links";
import {
  backfillFurigana,
  createSentence,
  createSentencesMany,
  deleteSentence,
  getSentence,
  getSentenceMedia,
  listSentences,
  regenerateSentenceFurigana,
  updateSentence,
} from "@/services/sentences";
import { handleUpstreamError } from "@/routes/upstream-errors";
import { termsSchema } from "@/routes/schemas/terms";

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
      ...termsSchema,
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
    shadowingCandidate: {
      type: "boolean",
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
      params: idParams,
    },
  }, async (req, reply) => {
    const sentence = await getSentence(idOf(req));
    if (!sentence) return notFound(reply, "Sentence");
    return sentence;
  });

  for (const which of ["audio", "image"] as const) {
    app.get(`/api/sentences/:id/${which}`, {
      schema: {
        tags: ["sentences"],
        params: idParams,
      },
    }, async (req, reply) => {
      try {
        const media = await getSentenceMedia(idOf(req), which);
        if (!media) return reply.code(404).send({
          message: `No ${which} for this sentence`,
        });
        reply.header("Content-Type", media.contentType);
        reply.header("Cache-Control", "private, max-age=86400");
        return reply.send(media.body);
      }
      catch (err) {
        return handleUpstreamError(err, reply);
      }
    });
  }

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
      params: idParams,
    },
  }, async (req, reply) => {
    const sentence = await regenerateSentenceFurigana(idOf(req));
    if (!sentence) return notFound(reply, "Sentence");
    return sentence;
  });

  app.get("/api/sentences/:id/vocab", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req) => {
    return getVocabForSentence(idOf(req));
  });

  app.put("/api/sentences/:id/vocab", {
    schema: {
      tags: ["sentences"],
      params: idParams,
      body: setVocabBody,
    },
  }, async (req, reply) => {
    const {
      vocabIds,
    } = req.body as { vocabIds: string[] };
    const linked = await setVocabForSentence(idOf(req), vocabIds);
    if (!linked) return notFound(reply, "Sentence");
    return linked;
  });

  app.patch(
    "/api/sentences/:id",
    {
      schema: {
        tags: ["sentences"],
        params: idParams,
        body: updateSentenceBody,
      },
    },
    async (req, reply) => {
      const sentence = await updateSentence(idOf(req), req.body as UpdateSentenceInput);
      if (!sentence) return notFound(reply, "Sentence");
      return sentence;
    },
  );

  app.delete("/api/sentences/:id", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteSentence(idOf(req));
    if (!deleted) return notFound(reply, "Sentence");
    return reply.code(204).send();
  });
}
