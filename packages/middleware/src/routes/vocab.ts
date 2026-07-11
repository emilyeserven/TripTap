import type { FastifyInstance } from "fastify";
import type { CreateVocabInput } from "@sentence-bank/types";
import {
  createVocab,
  createVocabMany,
  deleteVocab,
  getSentencesForVocab,
  listVocab,
} from "@/services/vocab";

const vocabParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const createVocabBody = {
  type: "object",
  required: ["term", "language"],
  additionalProperties: false,
  properties: {
    term: {
      type: "string",
      minLength: 1,
    },
    reading: {
      type: ["string", "null"],
    },
    meaning: {
      type: ["string", "null"],
    },
    language: {
      type: "string",
      minLength: 1,
    },
    sourceId: {
      type: ["string", "null"],
      format: "uuid",
    },
    page: {
      type: ["string", "null"],
    },
    tags: {
      type: ["string", "null"],
    },
    notes: {
      type: ["string", "null"],
    },
  },
} as const;

const bulkVocabBody = {
  type: "object",
  required: ["vocab"],
  additionalProperties: false,
  properties: {
    vocab: {
      type: "array",
      items: createVocabBody,
    },
  },
} as const;

/** CRUD routes for the standalone vocab bank, mounted under `/api/vocab`. */
export async function vocabRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/vocab", {
    schema: {
      tags: ["vocab"],
    },
  }, async () => listVocab());

  app.post("/api/vocab", {
    schema: {
      tags: ["vocab"],
      body: createVocabBody,
    },
  }, async (req, reply) => {
    const created = await createVocab(req.body as CreateVocabInput);
    return reply.code(201).send(created);
  });

  app.post("/api/vocab/bulk", {
    schema: {
      tags: ["vocab"],
      body: bulkVocabBody,
    },
  }, async (req, reply) => {
    const {
      vocab: inputs,
    } = req.body as { vocab: CreateVocabInput[] };
    const created = await createVocabMany(inputs);
    return reply.code(201).send(created);
  });

  app.get("/api/vocab/:id/sentences", {
    schema: {
      tags: ["vocab"],
      params: vocabParams,
    },
  }, async (req) => {
    const {
      id,
    } = req.params as { id: string };
    return getSentencesForVocab(id);
  });

  app.delete("/api/vocab/:id", {
    schema: {
      tags: ["vocab"],
      params: vocabParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteVocab(id);
    if (!deleted) return reply.code(404).send({
      message: "Vocab not found",
    });
    return reply.code(204).send();
  });
}
