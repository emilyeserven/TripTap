import type { FastifyInstance } from "fastify";
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

const lessonParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

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
  },
} as const;

const updateLessonBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createLessonBody.properties,
  },
} as const;

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
      params: lessonParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const lesson = await getLesson(id);
    if (!lesson) return reply.code(404).send({
      message: "Lesson not found",
    });
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
      params: lessonParams,
      body: updateLessonBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateLesson(id, req.body as UpdateLessonInput);
    if (!updated) return reply.code(404).send({
      message: "Lesson not found",
    });
    return updated;
  });

  app.delete("/api/lessons/:id", {
    schema: {
      tags: ["lessons"],
      params: lessonParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteLesson(id);
    if (!deleted) return reply.code(404).send({
      message: "Lesson not found",
    });
    return reply.code(204).send();
  });
}
