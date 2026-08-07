import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
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
import { termsSchema } from "@/routes/schemas/terms";

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
      // How the question's answer slot(s) are entered; "boolean"/"choice" render a button group.
      answerType: {
        type: "string",
        enum: ["text", "boolean", "choice"],
      },
      // The button-group options when answerType === "choice".
      choices: {
        type: "array",
        items: {
          type: "string",
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

/** A reference to one section of a bookmark (denormalized). Shared item shape across surfaces. */
const bookmarkSectionRefSchema = {
  type: "object",
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
    sections: {
      type: ["array", "null"],
      items: bookmarkSectionRefSchema,
    },
    dueDate: {
      type: ["string", "null"],
    },
    firstQuestionNumber: {
      type: "integer",
      minimum: 1,
    },
    learningAreas: {
      type: ["array", "null"],
      items: {
        type: "string",
        enum: LEARNING_AREAS,
      },
    },
    grammarTerms: {
      ...termsSchema,
    },
    questions: questionsSchema,
    grid: gridSchema,
  },
} as const;

const updateQuestionSheetBody = updateBodyOf(createQuestionSheetBody);

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
      params: idParams,
    },
  }, async (req, reply) => {
    const sheet = await getQuestionSheet(idOf(req));
    if (!sheet) return notFound(reply, "Question sheet");
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
      params: idParams,
      body: updateQuestionSheetBody,
    },
  }, async (req, reply) => {
    const updated = await updateQuestionSheet(idOf(req), req.body as UpdateQuestionSheetInput);
    if (!updated) return notFound(reply, "Question sheet");
    return updated;
  });

  app.delete("/api/question-sheets/:id", {
    schema: {
      tags: ["question-sheets"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteQuestionSheet(idOf(req));
    if (!deleted) return notFound(reply, "Question sheet");
    return reply.code(204).send();
  });
}
