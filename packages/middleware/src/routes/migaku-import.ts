import type { FastifyInstance, FastifyReply } from "fastify";
import type { CommitMigakuImportInput } from "@sentence-bank/types";
import { MediaNotConfiguredError, MediaUnavailableError } from "@/services/media";
import {
  commitImport,
  createImport,
  deleteImportedDeck,
  discardImport,
  getCandidateMedia,
  getImport,
  listImports,
  MigakuImportNotFoundError,
  MigakuParseError,
  reconcileMedia,
} from "@/services/migaku";

/** `.apkg` uploads bundle a media collection, so allow a much larger body than the 10 MiB default. */
const MAX_APKG_BYTES = 250 * 1024 * 1024;

const importParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const mediaParams = {
  type: "object",
  required: ["id", "candidateId"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
    candidateId: {
      type: "string",
    },
  },
} as const;

const commitBody = {
  type: "object",
  required: ["language", "deckName", "items"],
  additionalProperties: false,
  properties: {
    language: {
      type: "string",
      minLength: 1,
    },
    deckName: {
      type: "string",
      minLength: 1,
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "include", "kind", "text"],
        properties: {
          id: {
            type: "string",
          },
          include: {
            type: "boolean",
          },
          kind: {
            type: "string",
            enum: ["sentence", "vocab"],
          },
          text: {
            type: "string",
          },
          meaning: {
            type: ["string", "null"],
          },
          notes: {
            type: ["string", "null"],
          },
          tags: {
            type: ["string", "null"],
          },
          dedupAction: {
            type: "string",
            enum: ["link", "skip", "new"],
          },
        },
      },
    },
    groups: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "link", "imageTarget"],
        properties: {
          id: {
            type: "string",
          },
          link: {
            type: "boolean",
          },
          imageTarget: {
            type: "string",
            enum: ["none", "sentence", "vocab", "both"],
          },
        },
      },
    },
  },
} as const;

/** Map Migaku/media error classes to HTTP status codes; rethrow anything else. */
function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof MigakuParseError) return reply.code(422).send({
    message: err.message,
  });
  if (err instanceof MigakuImportNotFoundError) return reply.code(404).send({
    message: err.message,
  });
  if (err instanceof MediaNotConfiguredError) return reply.code(503).send({
    message: err.message,
  });
  if (err instanceof MediaUnavailableError) return reply.code(502).send({
    message: err.message,
  });
  throw err;
}

/** Routes for importing Migaku `.apkg` decks, mounted under `/api/migaku-imports`. */
export async function migakuImportRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/migaku-imports", {
    schema: {
      tags: ["migaku-import"],
    },
  }, async () => listImports());

  app.post("/api/migaku-imports", {
    schema: {
      tags: ["migaku-import"],
      consumes: ["multipart/form-data"],
    },
  }, async (req, reply) => {
    const file = await req.file({
      limits: {
        fileSize: MAX_APKG_BYTES,
      },
    });
    if (!file) return reply.code(400).send({
      message: "Expected a .apkg file upload",
    });
    const buffer = await file.toBuffer();
    if (file.file.truncated) {
      return reply.code(413).send({
        message: "The .apkg file is too large to import",
      });
    }
    try {
      const created = await createImport(buffer, file.filename);
      return reply.code(201).send(created);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/migaku-imports/:id", {
    schema: {
      tags: ["migaku-import"],
      params: importParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const detail = await getImport(id);
    if (!detail) return reply.code(404).send({
      message: "Import not found",
    });
    return detail;
  });

  for (const which of ["audio", "image"] as const) {
    app.get(`/api/migaku-imports/:id/candidates/:candidateId/${which}`, {
      schema: {
        tags: ["migaku-import"],
        params: mediaParams,
      },
    }, async (req, reply) => {
      const {
        id, candidateId,
      } = req.params as { id: string;
        candidateId: string; };
      try {
        const media = await getCandidateMedia(id, candidateId, which);
        if (!media) return reply.code(404).send({
          message: `No ${which} for this candidate`,
        });
        reply.header("Content-Type", media.contentType);
        reply.header("Cache-Control", "private, max-age=3600");
        return reply.send(media.body);
      }
      catch (err) {
        return handleError(err, reply);
      }
    });
  }

  app.post("/api/migaku-imports/:id/commit", {
    schema: {
      tags: ["migaku-import"],
      params: importParams,
      body: commitBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    try {
      const result = await commitImport(id, req.body as CommitMigakuImportInput);
      return result;
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/api/migaku-imports/reconcile", {
    schema: {
      tags: ["migaku-import"],
      querystring: {
        type: "object",
        properties: {
          dryRun: {
            type: "boolean",
            default: false,
          },
        },
      },
    },
  }, async (req, reply) => {
    const {
      dryRun,
    } = req.query as { dryRun?: boolean };
    try {
      return await reconcileMedia({
        dryRun: dryRun ?? false,
      });
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.delete("/api/migaku-imports/:id", {
    schema: {
      tags: ["migaku-import"],
      params: importParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await discardImport(id);
    if (!deleted) return reply.code(404).send({
      message: "Import not found",
    });
    return reply.code(204).send();
  });

  // Destructive: delete every bank row imported under this deck (by tag) and the import record.
  app.delete("/api/migaku-imports/:id/cards", {
    schema: {
      tags: ["migaku-import"],
      params: importParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const result = await deleteImportedDeck(id);
    if (!result) return reply.code(404).send({
      message: "Import not found",
    });
    return result;
  });
}
