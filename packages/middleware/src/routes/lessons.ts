import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateLessonInput,
  UpdateLessonInput,
} from "@sentence-bank/types";
import { createLessonJsonSchema } from "@sentence-bank/types";
import {
  createLesson,
  deleteLesson,
  getLesson,
  listLessons,
  updateLesson,
} from "@/services/lessons";

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

const createLessonBody = createLessonJsonSchema;

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
