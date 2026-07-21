import type { FastifyInstance, FastifyReply } from "fastify";
import type {
  CreateShadowingSessionInput,
  UpdateShadowingSessionInput,
} from "@sentence-bank/types";
import { MediaNotConfiguredError, MediaUnavailableError } from "@/services/media";
import {
  createShadowingSession,
  deleteShadowingSession,
  getShadowingSession,
  getShadowingSessionMedia,
  listShadowingSessions,
  setShadowingSessionAudio,
  updateShadowingSession,
} from "@/services/shadowing-sessions";
import {
  CaptionsNotFoundError,
  CaptionsUnavailableError,
  fetchCaptionSegments,
} from "@/services/youtube-captions";

/** An uploaded audio file can be large, but well under a `.apkg` — cap at 100 MiB. */
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

/** Map media error classes to HTTP status codes; rethrow anything else. */
function handleMediaError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof MediaNotConfiguredError) return reply.code(503).send({
    message: err.message,
  });
  if (err instanceof MediaUnavailableError) return reply.code(502).send({
    message: err.message,
  });
  throw err;
}

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
    defaultMaxReplays: {
      type: "integer",
      minimum: 1,
    },
    completedLoops: {
      type: "integer",
      minimum: 0,
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

const captionsQuery = {
  type: "object",
  required: ["videoUrl"],
  properties: {
    videoUrl: {
      type: "string",
      minLength: 1,
    },
    lang: {
      type: "string",
    },
  },
} as const;

/** CRUD routes for shadowing practice sessions, mounted under `/api/shadowing-sessions`. */
export async function shadowingSessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/shadowing-sessions", {
    schema: {
      tags: ["shadowing-sessions"],
    },
  }, async () => listShadowingSessions());

  // Derive practice segments from a YouTube video's captions (static path — matched before `:id`).
  app.get("/api/shadowing-sessions/captions", {
    schema: {
      tags: ["shadowing-sessions"],
      querystring: captionsQuery,
    },
  }, async (req, reply) => {
    const {
      videoUrl, lang,
    } = req.query as { videoUrl: string;
      lang?: string; };
    try {
      const segments = await fetchCaptionSegments(videoUrl, lang ?? null);
      return {
        segments,
      };
    }
    catch (err) {
      if (err instanceof CaptionsNotFoundError) return reply.code(404).send({
        message: err.message,
      });
      if (err instanceof CaptionsUnavailableError) return reply.code(502).send({
        message: err.message,
      });
      throw err;
    }
  });

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

  // Upload (or replace) the session's audio file. Multipart; the field is named `file`.
  app.post("/api/shadowing-sessions/:id/audio", {
    schema: {
      tags: ["shadowing-sessions"],
      params: shadowingSessionParams,
      consumes: ["multipart/form-data"],
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const file = await req.file({
      limits: {
        fileSize: MAX_AUDIO_BYTES,
      },
    });
    if (!file) return reply.code(400).send({
      message: "Expected an audio file upload",
    });
    const buffer = await file.toBuffer();
    if (file.file.truncated) {
      return reply.code(413).send({
        message: "The audio file is too large to upload",
      });
    }
    try {
      const updated = await setShadowingSessionAudio(
        id,
        buffer,
        file.filename,
        file.mimetype || "application/octet-stream",
      );
      if (!updated) return reply.code(404).send({
        message: "Shadowing session not found",
      });
      return updated;
    }
    catch (err) {
      return handleMediaError(err, reply);
    }
  });

  // Stream the session's stored audio for the `<audio>` player.
  app.get("/api/shadowing-sessions/:id/audio", {
    schema: {
      tags: ["shadowing-sessions"],
      params: shadowingSessionParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    try {
      const media = await getShadowingSessionMedia(id);
      if (!media) return reply.code(404).send({
        message: "No audio for this session",
      });
      reply.header("Content-Type", media.contentType);
      reply.header("Cache-Control", "private, max-age=86400");
      return reply.send(media.body);
    }
    catch (err) {
      return handleMediaError(err, reply);
    }
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
