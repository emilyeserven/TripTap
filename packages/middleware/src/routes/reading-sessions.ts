import type { FastifyInstance } from "fastify";
import type {
  CreateReadingSessionInput,
  UpdateReadingSessionInput,
} from "@sentence-bank/types";
import {
  createReadingSession,
  deleteReadingSession,
  getReadingSession,
  listReadingSessions,
  updateReadingSession,
} from "@/services/reading-sessions";

const readingSessionParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const linesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "text", "summaryOnly", "needsCorrection"],
    properties: {
      id: {
        type: "string",
      },
      text: {
        type: "string",
      },
      translation: {
        type: ["string", "null"],
      },
      summaryOnly: {
        type: "boolean",
      },
      correction: {
        type: ["string", "null"],
      },
      needsCorrection: {
        type: "boolean",
      },
    },
  },
} as const;

const wordNotesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "word", "status", "flashcard"],
    properties: {
      id: {
        type: "string",
      },
      word: {
        type: "string",
      },
      reading: {
        type: ["string", "null"],
      },
      meaning: {
        type: ["string", "null"],
      },
      status: {
        type: "string",
        enum: ["shaky", "unknown"],
      },
      flashcard: {
        type: "boolean",
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

const createReadingSessionBody = {
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
    sourceId: {
      type: ["string", "null"],
    },
    page: {
      type: ["string", "null"],
    },
    mode: {
      type: "string",
      enum: ["freeform", "line-by-line"],
    },
    passage: {
      type: ["string", "null"],
    },
    freeformTranslation: {
      type: ["string", "null"],
    },
    summary: {
      type: ["string", "null"],
    },
    lines: linesSchema,
    wordNotes: wordNotesSchema,
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

const updateReadingSessionBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createReadingSessionBody.properties,
  },
} as const;

/** CRUD routes for reading sessions, mounted under `/api/reading-sessions`. */
export async function readingSessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/reading-sessions", {
    schema: {
      tags: ["reading-sessions"],
    },
  }, async () => listReadingSessions());

  app.get("/api/reading-sessions/:id", {
    schema: {
      tags: ["reading-sessions"],
      params: readingSessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const session = await getReadingSession(id);
    if (!session) return reply.code(404).send({
      message: "Reading session not found",
    });
    return session;
  });

  app.post("/api/reading-sessions", {
    schema: {
      tags: ["reading-sessions"],
      body: createReadingSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateReadingSessionInput;
    const created = await createReadingSession(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/reading-sessions/:id",
    {
      schema: {
        tags: ["reading-sessions"],
        params: readingSessionParams,
        body: updateReadingSessionBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updateReadingSession(id, req.body as UpdateReadingSessionInput);
      if (!updated) return reply.code(404).send({
        message: "Reading session not found",
      });
      return updated;
    },
  );

  app.delete("/api/reading-sessions/:id", {
    schema: {
      tags: ["reading-sessions"],
      params: readingSessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteReadingSession(id);
    if (!deleted) return reply.code(404).send({
      message: "Reading session not found",
    });
    return reply.code(204).send();
  });
}
