import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateLessonInput,
  UpdateLessonInput,
} from "@sentence-bank/types";
import {
  createLesson,
  deleteLesson,
  getLesson,
  listLessons,
  updateLesson,
} from "@/services/lessons";
import { LEARNING_AREAS } from "@sentence-bank/types";

const listQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    tutorId: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const listeningNotesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "text"],
    properties: {
      id: {
        type: "string",
      },
      text: {
        type: "string",
      },
      context: {
        type: ["string", "null"],
      },
    },
  },
} as const;

const wordNotesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "word", "reading", "meaning", "notes", "status", "flashcard"],
    properties: {
      id: {
        type: "string",
      },
      word: {
        type: ["string", "null"],
      },
      reading: {
        type: ["string", "null"],
      },
      meaning: {
        type: ["string", "null"],
      },
      notes: {
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

const answerSheetIdsSchema = {
  type: ["array", "null"],
  items: {
    type: "string",
    format: "uuid",
  },
} as const;

const createLessonBody = {
  type: "object",
  required: ["date"],
  additionalProperties: false,
  properties: {
    date: {
      type: "string",
      format: "date",
    },
    language: {
      type: "string",
    },
    title: {
      type: ["string", "null"],
    },
    tutorId: {
      type: ["string", "null"],
      format: "uuid",
    },
    notes: {
      type: ["string", "null"],
    },
    listeningNotes: listeningNotesSchema,
    wordNotes: wordNotesSchema,
    answerSheetIds: answerSheetIdsSchema,
    durationMinutes: {
      type: "integer",
      minimum: 0,
    },
    learningArea: {
      type: ["string", "null"],
      enum: [...LEARNING_AREAS, null],
    },
    countsTowardXp: {
      type: "boolean",
    },
  },
} as const;

const updateLessonBody = updateBodyOf(createLessonBody);

/** CRUD routes for lessons (tutoring sessions), mounted under `/api/lessons`. */
export async function lessonRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/lessons", {
    schema: {
      tags: ["lessons"],
      querystring: listQuery,
    },
  }, async (req) => {
    const {
      tutorId,
    } = req.query as { tutorId?: string };
    return listLessons(tutorId);
  });

  app.get("/api/lessons/:id", {
    schema: {
      tags: ["lessons"],
      params: idParams,
    },
  }, async (req, reply) => {
    const lesson = await getLesson(idOf(req));
    if (!lesson) return notFound(reply, "Lesson");
    return lesson;
  });

  app.post("/api/lessons", {
    schema: {
      tags: ["lessons"],
      body: createLessonBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateLessonInput;
    const created = await createLesson(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/lessons/:id", {
    schema: {
      tags: ["lessons"],
      params: idParams,
      body: updateLessonBody,
    },
  }, async (req, reply) => {
    const updated = await updateLesson(idOf(req), req.body as UpdateLessonInput);
    if (!updated) return notFound(reply, "Lesson");
    return updated;
  });

  app.delete("/api/lessons/:id", {
    schema: {
      tags: ["lessons"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteLesson(idOf(req));
    if (!deleted) return notFound(reply, "Lesson");
    return reply.code(204).send();
  });
}
