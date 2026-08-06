import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateShadowingSessionInput,
  UpdateShadowingSessionInput,
} from "@sentence-bank/types";
import { handleUpstreamError } from "@/routes/upstream-errors";
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
import { termsSchema } from "@/routes/schemas/terms";
import { LEARNING_AREAS } from "@sentence-bank/types";

/** An uploaded audio file can be large, but well under a `.apkg` — cap at 100 MiB. */
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

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
    learningArea: {
      type: ["string", "null"],
      enum: [...LEARNING_AREAS, null],
    },
    countsTowardXp: {
      type: "boolean",
    },
    shadowingListId: {
      type: ["string", "null"],
      format: "uuid",
    },
  },
} as const;

const updateShadowingSessionBody = updateBodyOf(createShadowingSessionBody);

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
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getShadowingSession(idOf(req));
    if (!session) return notFound(reply, "Shadowing session");
    return session;
  });

  // Upload (or replace) the session's audio file. Multipart; the field is named `file`.
  app.post("/api/shadowing-sessions/:id/audio", {
    schema: {
      tags: ["shadowing-sessions"],
      params: idParams,
      consumes: ["multipart/form-data"],
    },
  }, async (req, reply) => {
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
        idOf(req),
        buffer,
        file.filename,
        file.mimetype || "application/octet-stream",
      );
      if (!updated) return notFound(reply, "Shadowing session");
      return updated;
    }
    catch (err) {
      return handleUpstreamError(err, reply);
    }
  });

  // Stream the session's stored audio for the `<audio>` player.
  app.get("/api/shadowing-sessions/:id/audio", {
    schema: {
      tags: ["shadowing-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    try {
      const media = await getShadowingSessionMedia(idOf(req));
      if (!media) return reply.code(404).send({
        message: "No audio for this session",
      });
      reply.header("Content-Type", media.contentType);
      reply.header("Cache-Control", "private, max-age=86400");
      return reply.send(media.body);
    }
    catch (err) {
      return handleUpstreamError(err, reply);
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
        params: idParams,
        body: updateShadowingSessionBody,
      },
    },
    async (req, reply) => {
      const updated = await updateShadowingSession(idOf(req), req.body as UpdateShadowingSessionInput);
      if (!updated) return notFound(reply, "Shadowing session");
      return updated;
    },
  );

  app.delete("/api/shadowing-sessions/:id", {
    schema: {
      tags: ["shadowing-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteShadowingSession(idOf(req));
    if (!deleted) return notFound(reply, "Shadowing session");
    return reply.code(204).send();
  });
}
