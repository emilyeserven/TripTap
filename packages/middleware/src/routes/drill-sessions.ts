import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateDrillSessionInput,
  UpdateDrillSessionInput,
} from "@sentence-bank/types";
import { DRILL_TYPES, LEARNING_AREAS } from "@sentence-bank/types";
import {
  createDrillSession,
  deleteDrillSession,
  getDrillSession,
  listDrillSessions,
  updateDrillSession,
} from "@/services/drill-sessions";

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
      cue: {
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

/** A reference to one section of a bookmark (denormalized), or null. */
const bookmarkSectionRefSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["id", "label", "type"],
  properties: {
    id: {
      type: "string",
    },
    label: {
      type: "string",
    },
    type: {
      type: "string",
      enum: ["name", "url", "page", "timestamp"],
    },
    startValue: {
      type: ["string", "null"],
    },
    endValue: {
      type: ["string", "null"],
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
    type: {
      type: ["string", "null"],
      enum: [...DRILL_TYPES, null],
    },
    learningArea: {
      type: ["string", "null"],
      enum: [...LEARNING_AREAS, null],
    },
    bookmarkId: {
      type: ["string", "null"],
    },
    bookmarkTitle: {
      type: ["string", "null"],
    },
    bookmarkUrl: {
      type: ["string", "null"],
    },
    section: bookmarkSectionRefSchema,
  },
} as const;

const updateSessionBody = updateBodyOf(createSessionBody);

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
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getDrillSession(idOf(req));
    if (!session) return notFound(reply, "Drill session");
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
      params: idParams,
      body: updateSessionBody,
    },
  }, async (req, reply) => {
    const updated = await updateDrillSession(idOf(req), req.body as UpdateDrillSessionInput);
    if (!updated) return notFound(reply, "Drill session");
    return updated;
  });

  app.delete("/api/drill-sessions/:id", {
    schema: {
      tags: ["drill-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteDrillSession(idOf(req));
    if (!deleted) return notFound(reply, "Drill session");
    return reply.code(204).send();
  });
}
