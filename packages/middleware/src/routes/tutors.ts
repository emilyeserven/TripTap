import type { FastifyInstance } from "fastify";
import type {
  CreateTutorInput,
  UpdateTutorInput,
} from "@sentence-bank/types";
import {
  createTutor,
  deleteTutor,
  getTutor,
  listTutors,
  updateTutor,
} from "@/services/tutors";

const tutorParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

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

const updateTutorBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createTutorBody.properties,
  },
} as const;

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
      params: tutorParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const tutor = await getTutor(id);
    if (!tutor) return reply.code(404).send({
      message: "Tutor not found",
    });
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
      params: tutorParams,
      body: updateTutorBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateTutor(id, req.body as UpdateTutorInput);
    if (!updated) return reply.code(404).send({
      message: "Tutor not found",
    });
    return updated;
  });

  app.delete("/api/tutors/:id", {
    schema: {
      tags: ["tutors"],
      params: tutorParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteTutor(id);
    if (!deleted) return reply.code(404).send({
      message: "Tutor not found",
    });
    return reply.code(204).send();
  });
}
