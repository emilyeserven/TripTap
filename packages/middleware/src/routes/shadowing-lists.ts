import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
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

const updateShadowingListBody = updateBodyOf(createShadowingListBody);

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
      params: idParams,
    },
  }, async (req, reply) => {
    const list = await getShadowingList(idOf(req));
    if (!list) return notFound(reply, "Shadowing list");
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
      params: idParams,
      body: updateShadowingListBody,
    },
  }, async (req, reply) => {
    const updated = await updateShadowingList(idOf(req), req.body as UpdateShadowingListInput);
    if (!updated) return notFound(reply, "Shadowing list");
    return updated;
  });

  app.delete("/api/shadowing-lists/:id", {
    schema: {
      tags: ["shadowing-lists"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteShadowingList(idOf(req));
    if (!deleted) return notFound(reply, "Shadowing list");
    return reply.code(204).send();
  });
}
