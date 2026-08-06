import type { FastifyInstance } from "fastify";
import type {
  CreateTutorInput,
  UpdateTutorInput,
} from "@sentence-bank/types";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import {
  createTutor,
  deleteTutor,
  getTutor,
  listTutors,
  updateTutor,
} from "@/services/tutors";

const createTutorBody = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    notes: {
      type: ["string", "null"],
    },
  },
} as const;

const updateTutorBody = updateBodyOf(createTutorBody);

/** CRUD routes for tutors (who ran a lesson), mounted under `/api/tutors`. */
export async function tutorRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/tutors", {
    schema: {
      tags: ["tutors"],
    },
  }, async () => listTutors());

  app.get("/api/tutors/:id", {
    schema: {
      tags: ["tutors"],
      params: idParams,
    },
  }, async (req, reply) => {
    const tutor = await getTutor(idOf(req));
    if (!tutor) return notFound(reply, "Tutor");
    return tutor;
  });

  app.post("/api/tutors", {
    schema: {
      tags: ["tutors"],
      body: createTutorBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateTutorInput;
    const created = await createTutor(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/tutors/:id", {
    schema: {
      tags: ["tutors"],
      params: idParams,
      body: updateTutorBody,
    },
  }, async (req, reply) => {
    const updated = await updateTutor(idOf(req), req.body as UpdateTutorInput);
    if (!updated) return notFound(reply, "Tutor");
    return updated;
  });

  app.delete("/api/tutors/:id", {
    schema: {
      tags: ["tutors"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteTutor(idOf(req));
    if (!deleted) return notFound(reply, "Tutor");
    return reply.code(204).send();
  });
}
