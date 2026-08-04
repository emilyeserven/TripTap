import type { FastifyInstance } from "fastify";
import type { CreateDialogueInput, UpdateDialogueInput } from "@sentence-bank/types";
import { LEARNING_AREAS } from "@sentence-bank/types";
import {
  createDialogue,
  deleteDialogue,
  getDialogue,
  listDialogues,
  updateDialogue,
} from "@/services/dialogues";

const dialogueParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

/**
 * Lines are accepted so the client can send back edited translations. Their `speaker`/`text` are
 * re-derived from `script` on write, so what arrives here only ever contributes translations.
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
    },
  },
} as const;

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

const updateDialogueBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createDialogueBody.properties,
  },
} as const;

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
      params: dialogueParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const dialogue = await getDialogue(id);
    if (!dialogue) return reply.code(404).send({
      message: "Dialogue not found",
    });
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
      params: dialogueParams,
      body: updateDialogueBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateDialogue(id, req.body as UpdateDialogueInput);
    if (!updated) return reply.code(404).send({
      message: "Dialogue not found",
    });
    return updated;
  });

  app.delete("/api/dialogues/:id", {
    schema: {
      tags: ["dialogues"],
      params: dialogueParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteDialogue(id);
    if (!deleted) return reply.code(404).send({
      message: "Dialogue not found",
    });
    return reply.code(204).send();
  });
}
