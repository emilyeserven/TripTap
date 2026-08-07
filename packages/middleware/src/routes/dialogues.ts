import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type { CreateDialogueInput, UpdateDialogueInput } from "@sentence-bank/types";
import { LEARNING_AREAS, bookmarkSectionRefJsonSchema } from "@sentence-bank/types";
import {
  createDialogue,
  deleteDialogue,
  getDialogue,
  listDialogues,
  updateDialogue,
} from "@/services/dialogues";

/**
 * Lines are accepted so the client can send back edited translations and practice hints. Their
 * `speaker`/`text` are re-derived from `script` on write, so what arrives here only ever contributes
 * those annotations.
 */
const linesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "speaker", "text"],
    properties: {
      id: {
        type: "string",
      },
      speaker: {
        type: ["string", "null"],
      },
      text: {
        type: "string",
      },
      reading: {
        type: ["array", "null"],
        items: {
          type: "object",
          additionalProperties: false,
          required: ["t"],
          properties: {
            t: {
              type: "string",
            },
            r: {
              type: ["string", "null"],
            },
          },
        },
      },
      readingError: {
        type: ["string", "null"],
      },
      translation: {
        type: ["string", "null"],
      },
      hint: {
        type: ["string", "null"],
      },
    },
  },
} as const;

/** A reference to one section of a bookmark (denormalized), or null. */

const createDialogueBody = {
  type: "object",
  required: ["title", "language", "date", "script"],
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
    script: {
      type: "string",
      minLength: 1,
    },
    lines: linesSchema,
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
    selfSpeakers: {
      type: ["array", "null"],
      items: {
        type: "string",
      },
    },
    countsTowardXp: {
      type: "boolean",
    },
    learningArea: {
      type: ["string", "null"],
      enum: [...LEARNING_AREAS, null],
    },
  },
} as const;

const updateDialogueBody = updateBodyOf(createDialogueBody);

/** CRUD routes for chat-transcript dialogues, mounted under `/api/dialogues`. */
export async function dialoguesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/dialogues", {
    schema: {
      tags: ["dialogues"],
    },
  }, async () => listDialogues());

  app.get("/api/dialogues/:id", {
    schema: {
      tags: ["dialogues"],
      params: idParams,
    },
  }, async (req, reply) => {
    const dialogue = await getDialogue(idOf(req));
    if (!dialogue) return notFound(reply, "Dialogue");
    return dialogue;
  });

  app.post("/api/dialogues", {
    schema: {
      tags: ["dialogues"],
      body: createDialogueBody,
    },
  }, async (req, reply) => {
    const created = await createDialogue(req.body as CreateDialogueInput);
    return reply.code(201).send(created);
  });

  app.patch("/api/dialogues/:id", {
    schema: {
      tags: ["dialogues"],
      params: idParams,
      body: updateDialogueBody,
    },
  }, async (req, reply) => {
    const updated = await updateDialogue(idOf(req), req.body as UpdateDialogueInput);
    if (!updated) return notFound(reply, "Dialogue");
    return updated;
  });

  app.delete("/api/dialogues/:id", {
    schema: {
      tags: ["dialogues"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteDialogue(idOf(req));
    if (!deleted) return notFound(reply, "Dialogue");
    return reply.code(204).send();
  });
}
