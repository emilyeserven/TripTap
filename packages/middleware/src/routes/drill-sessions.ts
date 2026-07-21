import type { FastifyInstance } from "fastify";
import type {
  CreateDrillSessionInput,
  UpdateDrillSessionInput,
} from "@sentence-bank/types";
import { LEARNING_AREAS } from "@sentence-bank/types";
import {
  createDrillSession,
  deleteDrillSession,
  getDrillSession,
  listDrillSessions,
  updateDrillSession,
} from "@/services/drill-sessions";

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

const mistakesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "prompt", "reasons"],
    properties: {
      id: {
        type: "string",
      },
      question: {
        type: ["string", "null"],
      },
      prompt: {
        type: "string",
      },
      correctAnswer: {
        type: ["string", "null"],
      },
      reflection: {
        type: ["string", "null"],
      },
      reasons: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["categoryId"],
          properties: {
            categoryId: {
              type: "string",
            },
            subcategoryId: {
              type: ["string", "null"],
            },
            reasonId: {
              type: ["string", "null"],
            },
          },
        },
      },
    },
  },
} as const;

const createSessionBody = {
  type: "object",
  required: ["date"],
  additionalProperties: false,
  properties: {
    date: {
      type: "string",
      format: "date",
    },
    title: {
      type: ["string", "null"],
    },
    notes: {
      type: ["string", "null"],
    },
    mistakes: mistakesSchema,
    questions: {
      type: "integer",
      minimum: 0,
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

/** CRUD routes for Drill Buddy sessions (mistake logs), mounted under `/api/drill-sessions`. */
export async function drillSessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/drill-sessions", {
    schema: {
      tags: ["drill-sessions"],
    },
  }, async () => listDrillSessions());

  app.get("/api/drill-sessions/:id", {
    schema: {
      tags: ["drill-sessions"],
      params: sessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const session = await getDrillSession(id);
    if (!session) return reply.code(404).send({
      message: "Drill session not found",
    });
    return session;
  });

  app.post("/api/drill-sessions", {
    schema: {
      tags: ["drill-sessions"],
      body: createSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateDrillSessionInput;
    const created = await createDrillSession(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/drill-sessions/:id", {
    schema: {
      tags: ["drill-sessions"],
      params: sessionParams,
      body: updateSessionBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateDrillSession(id, req.body as UpdateDrillSessionInput);
    if (!updated) return reply.code(404).send({
      message: "Drill session not found",
    });
    return updated;
  });

  app.delete("/api/drill-sessions/:id", {
    schema: {
      tags: ["drill-sessions"],
      params: sessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteDrillSession(id);
    if (!deleted) return reply.code(404).send({
      message: "Drill session not found",
    });
    return reply.code(204).send();
  });
}
