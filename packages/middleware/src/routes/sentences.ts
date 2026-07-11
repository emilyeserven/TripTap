import type { FastifyInstance } from "fastify";
import type { CreateSentenceInput, UpdateSentenceInput } from "@sentence-bank/types";
import {
  createSentence,
  deleteSentence,
  getSentence,
  listSentences,
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
  required: ["text", "translation", "language"],
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      minLength: 1,
    },
    translation: {
      type: "string",
      minLength: 1,
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
  },
} as const;

const updateSentenceBody = {
  type: "object",
  additionalProperties: false,
  properties: createSentenceBody.properties,
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
