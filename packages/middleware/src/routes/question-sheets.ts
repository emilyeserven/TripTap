import type { FastifyInstance } from "fastify";
import type {
  CreateQuestionSheetInput,
  UpdateQuestionSheetInput,
} from "@sentence-bank/types";
import { LEARNING_AREAS } from "@sentence-bank/types";
import {
  createQuestionSheet,
  deleteQuestionSheet,
  getQuestionSheet,
  listQuestionSheets,
  updateQuestionSheet,
} from "@/services/question-sheets";

const questionSheetParams = {
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
 * A question-sheet part, defined as a shared schema so it can reference itself: parts nest recursively
 * (a part may carry its own `parts`). Registered on the Fastify instance via {@link app.addSchema} so
 * the `$ref` below resolves at route-registration time.
 */
const partSchema = {
  $id: "questionSheetPart",
  type: "object",
  additionalProperties: false,
  required: ["id", "label"],
  properties: {
    id: {
      type: "string",
    },
    label: {
      type: "string",
    },
    parts: {
      type: "array",
      items: {
        $ref: "questionSheetPart",
      },
    },
  },
} as const;

const questionsSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "prompt"],
    properties: {
      id: {
        type: "string",
      },
      prompt: {
        type: "string",
      },
      parts: {
        type: "array",
        items: {
          $ref: "questionSheetPart",
        },
      },
    },
  },
} as const;

const gridSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["columns", "rows"],
  properties: {
    columns: {
      type: "array",
      items: {
        type: "string",
      },
    },
    rows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label"],
        properties: {
          id: {
            type: "string",
          },
          label: {
            type: "string",
          },
        },
      },
    },
  },
} as const;

const createQuestionSheetBody = {
  type: "object",
  required: ["title", "layout"],
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      minLength: 1,
    },
    layout: {
      type: "string",
      enum: ["list", "grid"],
    },
    notes: {
      type: ["string", "null"],
    },
    page: {
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
    dueDate: {
      type: ["string", "null"],
    },
    learningAreas: {
      type: ["array", "null"],
      items: {
        type: "string",
        enum: LEARNING_AREAS,
      },
    },
    grammarTerms: {
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
    },
    questions: questionsSchema,
    grid: gridSchema,
  },
} as const;

const updateQuestionSheetBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createQuestionSheetBody.properties,
  },
} as const;

/** CRUD routes for question sheets (reusable exercise templates), mounted under `/api/question-sheets`. */
export async function questionSheetRoutes(app: FastifyInstance): Promise<void> {
  app.addSchema(partSchema);

  app.get("/api/question-sheets", {
    schema: {
      tags: ["question-sheets"],
    },
  }, async () => listQuestionSheets());

  app.get("/api/question-sheets/:id", {
    schema: {
      tags: ["question-sheets"],
      params: questionSheetParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const sheet = await getQuestionSheet(id);
    if (!sheet) return reply.code(404).send({
      message: "Question sheet not found",
    });
    return sheet;
  });

  app.post("/api/question-sheets", {
    schema: {
      tags: ["question-sheets"],
      body: createQuestionSheetBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateQuestionSheetInput;
    const created = await createQuestionSheet(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/question-sheets/:id", {
    schema: {
      tags: ["question-sheets"],
      params: questionSheetParams,
      body: updateQuestionSheetBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateQuestionSheet(id, req.body as UpdateQuestionSheetInput);
    if (!updated) return reply.code(404).send({
      message: "Question sheet not found",
    });
    return updated;
  });

  app.delete("/api/question-sheets/:id", {
    schema: {
      tags: ["question-sheets"],
      params: questionSheetParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteQuestionSheet(id);
    if (!deleted) return reply.code(404).send({
      message: "Question sheet not found",
    });
    return reply.code(204).send();
  });
}
