import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateListeningSessionInput,
  UpdateListeningSessionInput,
} from "@sentence-bank/types";
import {
  createListeningSession,
  deleteListeningSession,
  getListeningSession,
  listListeningSessions,
  updateListeningSession,
} from "@/services/listening-sessions";
import { termsSchema } from "@/routes/schemas/terms";
import { LEARNING_AREAS, bookmarkSectionRefJsonSchema } from "@sentence-bank/types";

const entriesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "text", "timestampMs", "mode", "source"],
    properties: {
      id: {
        type: "string",
      },
      text: {
        type: "string",
      },
      context: {
        type: "string",
      },
      timestampMs: {
        type: "number",
        minimum: 0,
      },
      mode: {
        type: "string",
        enum: ["typing-start", "submit"],
      },
      source: {
        type: "string",
        enum: ["video", "stopwatch"],
      },
    },
  },
} as const;

/** A reference to one section of a bookmark (denormalized), or null. */

const createListeningSessionBody = {
  type: "object",
  required: ["title", "language", "date"],
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      minLength: 1,
    },
    language: {
      type: "string",
      minLength: 1,
    },
    date: {
      type: "string",
      format: "date",
    },
    videoUrl: {
      type: ["string", "null"],
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
    section: bookmarkSectionRefJsonSchema,
    entries: entriesSchema,
    passive: {
      type: "boolean",
    },
    durationMinutes: {
      type: "integer",
      minimum: 0,
    },
    terms: termsSchema,
    learningArea: {
      type: ["string", "null"],
      enum: [...LEARNING_AREAS, null],
    },
    countsTowardXp: {
      type: "boolean",
    },
  },
} as const;

const updateListeningSessionBody = updateBodyOf(createListeningSessionBody);

/** CRUD routes for listening (Listen and Shadow) sessions, mounted under `/api/listening-sessions`. */
export async function listeningSessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/listening-sessions", {
    schema: {
      tags: ["listening-sessions"],
    },
  }, async () => listListeningSessions());

  app.get("/api/listening-sessions/:id", {
    schema: {
      tags: ["listening-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getListeningSession(idOf(req));
    if (!session) return notFound(reply, "Listening session");
    return session;
  });

  app.post("/api/listening-sessions", {
    schema: {
      tags: ["listening-sessions"],
      body: createListeningSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateListeningSessionInput;
    const created = await createListeningSession(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/listening-sessions/:id",
    {
      schema: {
        tags: ["listening-sessions"],
        params: idParams,
        body: updateListeningSessionBody,
      },
    },
    async (req, reply) => {
      const updated = await updateListeningSession(idOf(req), req.body as UpdateListeningSessionInput);
      if (!updated) return notFound(reply, "Listening session");
      return updated;
    },
  );

  app.delete("/api/listening-sessions/:id", {
    schema: {
      tags: ["listening-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteListeningSession(idOf(req));
    if (!deleted) return notFound(reply, "Listening session");
    return reply.code(204).send();
  });
}
