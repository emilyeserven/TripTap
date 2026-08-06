import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateTheorySessionInput,
  UpdateTheorySessionInput,
} from "@sentence-bank/types";
import { LEARNING_AREAS } from "@sentence-bank/types";
import {
  createTheorySession,
  deleteTheorySession,
  getTheorySession,
  listTheorySessions,
  updateTheorySession,
} from "@/services/theory-sessions";

const createSessionBody = {
  type: "object",
  required: ["date", "entryMode"],
  additionalProperties: false,
  properties: {
    date: {
      type: "string",
      format: "date",
    },
    title: {
      type: ["string", "null"],
    },
    entryMode: {
      type: "string",
      enum: ["pages", "words"],
    },
    pages: {
      type: ["integer", "null"],
      minimum: 0,
    },
    density: {
      type: ["string", "null"],
      enum: ["dense", "medium", "light", null],
    },
    wordCount: {
      type: ["integer", "null"],
      minimum: 0,
    },
    notesCount: {
      type: "integer",
      minimum: 0,
    },
    notes: {
      type: ["string", "null"],
    },
    learningArea: {
      type: ["string", "null"],
      enum: [...LEARNING_AREAS, null],
    },
  },
} as const;

const updateSessionBody = updateBodyOf(createSessionBody);

/** CRUD routes for Theory study sessions, mounted under `/api/theory-sessions`. */
export async function theorySessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/theory-sessions", {
    schema: {
      tags: ["theory-sessions"],
    },
  }, async () => listTheorySessions());

  app.get("/api/theory-sessions/:id", {
    schema: {
      tags: ["theory-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getTheorySession(idOf(req));
    if (!session) return notFound(reply, "Theory session");
    return session;
  });

  app.post("/api/theory-sessions", {
    schema: {
      tags: ["theory-sessions"],
      body: createSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateTheorySessionInput;
    const created = await createTheorySession(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/theory-sessions/:id", {
    schema: {
      tags: ["theory-sessions"],
      params: idParams,
      body: updateSessionBody,
    },
  }, async (req, reply) => {
    const updated = await updateTheorySession(idOf(req), req.body as UpdateTheorySessionInput);
    if (!updated) return notFound(reply, "Theory session");
    return updated;
  });

  app.delete("/api/theory-sessions/:id", {
    schema: {
      tags: ["theory-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteTheorySession(idOf(req));
    if (!deleted) return notFound(reply, "Theory session");
    return reply.code(204).send();
  });
}
