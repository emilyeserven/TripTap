import type { FastifyInstance } from "fastify";
import type { CreateMySentenceInput, UpdateMySentenceInput } from "@sentence-bank/types";
import {
  createMySentence,
  deleteMySentence,
  getMySentence,
  listMySentences,
  updateMySentence,
} from "@/services/my-sentences";

const mySentenceParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const listQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    practiceSentenceId: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const createMySentenceBody = {
  type: "object",
  required: ["text", "language"],
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      minLength: 1,
    },
    language: {
      type: "string",
      minLength: 1,
    },
    translation: {
      type: ["string", "null"],
    },
    practiceSentenceId: {
      type: ["string", "null"],
      format: "uuid",
    },
    needsCorrection: {
      type: "boolean",
    },
    correction: {
      type: ["string", "null"],
    },
  },
} as const;

const updateMySentenceBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createMySentenceBody.properties,
  },
} as const;

/** CRUD routes for my-sentences (learner-produced output), mounted under `/api/my-sentences`. */
export async function mySentenceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/my-sentences", {
    schema: {
      tags: ["my-sentences"],
      querystring: listQuery,
    },
  }, async (req) => {
    const {
      practiceSentenceId,
    } = req.query as { practiceSentenceId?: string };
    return listMySentences(practiceSentenceId);
  });

  app.get("/api/my-sentences/:id", {
    schema: {
      tags: ["my-sentences"],
      params: mySentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const mySentence = await getMySentence(id);
    if (!mySentence) return reply.code(404).send({
      message: "My sentence not found",
    });
    return mySentence;
  });

  app.post("/api/my-sentences", {
    schema: {
      tags: ["my-sentences"],
      body: createMySentenceBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateMySentenceInput;
    const created = await createMySentence(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/my-sentences/:id",
    {
      schema: {
        tags: ["my-sentences"],
        params: mySentenceParams,
        body: updateMySentenceBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updateMySentence(id, req.body as UpdateMySentenceInput);
      if (!updated) return reply.code(404).send({
        message: "My sentence not found",
      });
      return updated;
    },
  );

  app.delete("/api/my-sentences/:id", {
    schema: {
      tags: ["my-sentences"],
      params: mySentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteMySentence(id);
    if (!deleted) return reply.code(404).send({
      message: "My sentence not found",
    });
    return reply.code(204).send();
  });
}
