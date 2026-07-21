import type { FastifyInstance } from "fastify";
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

const sessionParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

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

const updateSessionBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createSessionBody.properties,
  },
} as const;

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
      params: sessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const session = await getTheorySession(id);
    if (!session) return reply.code(404).send({
      message: "Theory session not found",
    });
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
      params: sessionParams,
      body: updateSessionBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateTheorySession(id, req.body as UpdateTheorySessionInput);
    if (!updated) return reply.code(404).send({
      message: "Theory session not found",
    });
    return updated;
  });

  app.delete("/api/theory-sessions/:id", {
    schema: {
      tags: ["theory-sessions"],
      params: sessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteTheorySession(id);
    if (!deleted) return reply.code(404).send({
      message: "Theory session not found",
    });
    return reply.code(204).send();
  });
}
