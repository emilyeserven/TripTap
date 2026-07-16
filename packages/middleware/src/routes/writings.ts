import type { FastifyInstance } from "fastify";
import type { CreateWritingInput, UpdateWritingInput } from "@sentence-bank/types";
import {
  createWriting,
  deleteWriting,
  getWriting,
  listWritings,
  updateWriting,
} from "@/services/writings";

const writingParams = {
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
        enum: ["vocabulary", "grammar", "general", "resource", "listening"],
      },
    },
  },
} as const;

const correctionsSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "original", "corrected"],
    properties: {
      id: {
        type: "string",
      },
      original: {
        type: "string",
      },
      corrected: {
        type: "string",
      },
      note: {
        type: ["string", "null"],
      },
      marks: {
        type: ["array", "null"],
        items: {
          type: "object",
          additionalProperties: false,
          required: ["start", "end", "correct"],
          properties: {
            start: {
              type: "integer",
            },
            end: {
              type: "integer",
            },
            correct: {
              type: "boolean",
            },
          },
        },
      },
      mySentenceId: {
        type: ["string", "null"],
      },
    },
  },
} as const;

const createWritingBody = {
  type: "object",
  required: ["text", "language"],
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
    },
    language: {
      type: "string",
      minLength: 1,
    },
    meaning: {
      type: ["string", "null"],
    },
    comments: {
      type: ["string", "null"],
    },
    readyToReview: {
      type: "boolean",
    },
    terms: termsSchema,
    corrections: correctionsSchema,
    promptTitle: {
      type: ["string", "null"],
    },
    promptText: {
      type: ["string", "null"],
    },
  },
} as const;

const updateWritingBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createWritingBody.properties,
  },
} as const;

/** CRUD routes for writings (free-form learner writing), mounted under `/api/writings`. */
export async function writingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/writings", {
    schema: {
      tags: ["writings"],
    },
  }, async () => listWritings());

  app.get("/api/writings/:id", {
    schema: {
      tags: ["writings"],
      params: writingParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const writing = await getWriting(id);
    if (!writing) return reply.code(404).send({
      message: "Writing not found",
    });
    return writing;
  });

  app.post("/api/writings", {
    schema: {
      tags: ["writings"],
      body: createWritingBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateWritingInput;
    const created = await createWriting(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/writings/:id",
    {
      schema: {
        tags: ["writings"],
        params: writingParams,
        body: updateWritingBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updateWriting(id, req.body as UpdateWritingInput);
      if (!updated) return reply.code(404).send({
        message: "Writing not found",
      });
      return updated;
    },
  );

  app.delete("/api/writings/:id", {
    schema: {
      tags: ["writings"],
      params: writingParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteWriting(id);
    if (!deleted) return reply.code(404).send({
      message: "Writing not found",
    });
    return reply.code(204).send();
  });
}
