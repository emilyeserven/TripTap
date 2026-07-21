import type { FastifyInstance } from "fastify";
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

const listeningSessionParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const termsSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "name", "kind", "sourceId", "sourceLabel"],
    properties: {
      id: {
        type: "string",
      },
      name: {
        type: "string",
      },
      kind: {
        type: "string",
        enum: ["tag", "taxonomy"],
      },
      sourceId: {
        type: "string",
      },
      sourceLabel: {
        type: "string",
      },
      category: {
        type: "string",
        enum: ["vocabulary", "grammar", "general", "resource"],
      },
    },
  },
} as const;

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
    section: bookmarkSectionRefSchema,
    entries: entriesSchema,
    passive: {
      type: "boolean",
    },
    durationMinutes: {
      type: "integer",
      minimum: 0,
    },
    terms: termsSchema,
  },
} as const;

const updateListeningSessionBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createListeningSessionBody.properties,
  },
} as const;

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
      params: listeningSessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const session = await getListeningSession(id);
    if (!session) return reply.code(404).send({
      message: "Listening session not found",
    });
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
        params: listeningSessionParams,
        body: updateListeningSessionBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updateListeningSession(id, req.body as UpdateListeningSessionInput);
      if (!updated) return reply.code(404).send({
        message: "Listening session not found",
      });
      return updated;
    },
  );

  app.delete("/api/listening-sessions/:id", {
    schema: {
      tags: ["listening-sessions"],
      params: listeningSessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteListeningSession(id);
    if (!deleted) return reply.code(404).send({
      message: "Listening session not found",
    });
    return reply.code(204).send();
  });
}
