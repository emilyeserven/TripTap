import type { FastifyInstance } from "fastify";
import type {
  CreateShadowingSessionInput,
  UpdateShadowingSessionInput,
} from "@sentence-bank/types";
import {
  createShadowingSession,
  deleteShadowingSession,
  getShadowingSession,
  listShadowingSessions,
  updateShadowingSession,
} from "@/services/shadowing-sessions";

const shadowingSessionParams = {
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

const segmentsSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "startMs", "endMs"],
    properties: {
      id: {
        type: "string",
      },
      label: {
        type: ["string", "null"],
      },
      startMs: {
        type: "number",
        minimum: 0,
      },
      endMs: {
        type: "number",
        minimum: 0,
      },
      maxReplays: {
        type: ["integer", "null"],
        minimum: 1,
      },
      gapMs: {
        type: ["integer", "null"],
        minimum: 0,
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

const createShadowingSessionBody = {
  type: "object",
  required: ["title", "language"],
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
    defaultMaxReplays: {
      type: "integer",
      minimum: 1,
    },
    defaultGapMs: {
      type: "integer",
      minimum: 0,
    },
    segments: segmentsSchema,
    entries: entriesSchema,
    terms: termsSchema,
  },
} as const;

const updateShadowingSessionBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createShadowingSessionBody.properties,
  },
} as const;

/** CRUD routes for shadowing practice sessions, mounted under `/api/shadowing-sessions`. */
export async function shadowingSessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/shadowing-sessions", {
    schema: {
      tags: ["shadowing-sessions"],
    },
  }, async () => listShadowingSessions());

  app.get("/api/shadowing-sessions/:id", {
    schema: {
      tags: ["shadowing-sessions"],
      params: shadowingSessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const session = await getShadowingSession(id);
    if (!session) return reply.code(404).send({
      message: "Shadowing session not found",
    });
    return session;
  });

  app.post("/api/shadowing-sessions", {
    schema: {
      tags: ["shadowing-sessions"],
      body: createShadowingSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateShadowingSessionInput;
    const created = await createShadowingSession(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/shadowing-sessions/:id",
    {
      schema: {
        tags: ["shadowing-sessions"],
        params: shadowingSessionParams,
        body: updateShadowingSessionBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updateShadowingSession(id, req.body as UpdateShadowingSessionInput);
      if (!updated) return reply.code(404).send({
        message: "Shadowing session not found",
      });
      return updated;
    },
  );

  app.delete("/api/shadowing-sessions/:id", {
    schema: {
      tags: ["shadowing-sessions"],
      params: shadowingSessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteShadowingSession(id);
    if (!deleted) return reply.code(404).send({
      message: "Shadowing session not found",
    });
    return reply.code(204).send();
  });
}
