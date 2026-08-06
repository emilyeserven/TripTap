import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams } from "@/routes/schemas/params";
import type { CreateChunkCardInput, UpdateChunkCardInput } from "@sentence-bank/types";
import { createChunkCardJsonSchema } from "@sentence-bank/types";
import {
  createChunkCard,
  deleteChunkCard,
  getChunkCard,
  listChunkCards,
  updateChunkCard,
  VolumeCapError,
} from "@/services/chunk-cards";

const formatEnum = ["situation_production", "cloze"] as const;

const createChunkCardBody = createChunkCardJsonSchema;

const updateChunkCardBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    correctionId: {
      type: ["string", "null"],
      format: "uuid",
    },
    chunk: {
      type: "string",
      minLength: 1,
    },
    gloss: {
      type: "string",
    },
    format: {
      type: "string",
      enum: formatEnum,
    },
    prompt: {
      type: "string",
      minLength: 1,
    },
    answer: {
      type: "string",
      minLength: 1,
    },
    wrongForm: {
      type: ["string", "null"],
    },
    exportedAt: {
      type: ["string", "null"],
    },
  },
} as const;

const listChunkCardsQuery = {
  type: "object",
  properties: {
    batchId: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

/** CRUD routes for chunk cards, mounted under `/api/chunk-cards`. */
export async function chunkCardsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/chunk-cards", {
    schema: {
      tags: ["chunk-cards"],
      querystring: listChunkCardsQuery,
    },
  }, async (req) => {
    const {
      batchId,
    } = req.query as { batchId?: string };
    return listChunkCards({
      batchId,
    });
  });

  app.get("/api/chunk-cards/:id", {
    schema: {
      tags: ["chunk-cards"],
      params: idParams,
    },
  }, async (req, reply) => {
    const card = await getChunkCard(idOf(req));
    if (!card) return notFound(reply, "Chunk card");
    return card;
  });

  app.post("/api/chunk-cards", {
    schema: {
      tags: ["chunk-cards"],
      body: createChunkCardBody,
    },
  }, async (req, reply) => {
    try {
      const created = await createChunkCard(req.body as CreateChunkCardInput);
      return reply.code(201).send(created);
    }
    catch (err) {
      if (err instanceof VolumeCapError) return reply.code(400).send({
        message: err.message,
      });
      throw err;
    }
  });

  app.patch("/api/chunk-cards/:id", {
    schema: {
      tags: ["chunk-cards"],
      params: idParams,
      body: updateChunkCardBody,
    },
  }, async (req, reply) => {
    const updated = await updateChunkCard(idOf(req), req.body as UpdateChunkCardInput);
    if (!updated) return notFound(reply, "Chunk card");
    return updated;
  });

  app.delete("/api/chunk-cards/:id", {
    schema: {
      tags: ["chunk-cards"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteChunkCard(idOf(req));
    if (!deleted) return notFound(reply, "Chunk card");
    return reply.code(204).send();
  });
}
