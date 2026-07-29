import type { FastifyInstance } from "fastify";
import type {
  CreateShadowingListInput,
  UpdateShadowingListInput,
} from "@sentence-bank/types";
import {
  createShadowingList,
  deleteShadowingList,
  getShadowingList,
  listShadowingLists,
  updateShadowingList,
} from "@/services/shadowing-lists";

const shadowingListParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const idArray = {
  type: "array",
  items: {
    type: "string",
    format: "uuid",
  },
} as const;

const createShadowingListBody = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    notes: {
      type: ["string", "null"],
    },
    sentenceIds: idArray,
    mySentenceIds: idArray,
  },
} as const;

const updateShadowingListBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createShadowingListBody.properties,
  },
} as const;

/** CRUD routes for shadowing lists (named collections of shadowing candidates), under `/api/shadowing-lists`. */
export async function shadowingListRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/shadowing-lists", {
    schema: {
      tags: ["shadowing-lists"],
    },
  }, async () => listShadowingLists());

  app.get("/api/shadowing-lists/:id", {
    schema: {
      tags: ["shadowing-lists"],
      params: shadowingListParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const list = await getShadowingList(id);
    if (!list) return reply.code(404).send({
      message: "Shadowing list not found",
    });
    return list;
  });

  app.post("/api/shadowing-lists", {
    schema: {
      tags: ["shadowing-lists"],
      body: createShadowingListBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateShadowingListInput;
    const created = await createShadowingList(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/shadowing-lists/:id", {
    schema: {
      tags: ["shadowing-lists"],
      params: shadowingListParams,
      body: updateShadowingListBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateShadowingList(id, req.body as UpdateShadowingListInput);
    if (!updated) return reply.code(404).send({
      message: "Shadowing list not found",
    });
    return updated;
  });

  app.delete("/api/shadowing-lists/:id", {
    schema: {
      tags: ["shadowing-lists"],
      params: shadowingListParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteShadowingList(id);
    if (!deleted) return reply.code(404).send({
      message: "Shadowing list not found",
    });
    return reply.code(204).send();
  });
}
