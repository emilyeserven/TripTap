import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateTheorySessionInput,
  UpdateTheorySessionInput,
} from "@sentence-bank/types";
import { createTheorySessionJsonSchema } from "@sentence-bank/types";
import {
  createTheorySession,
  deleteTheorySession,
  getTheorySession,
  listTheorySessions,
  updateTheorySession,
} from "@/services/theory-sessions";

const createSessionBody = createTheorySessionJsonSchema;

const updateSessionBody = updateBodyOf(createSessionBody);

/** CRUD routes for Theory study sessions, mounted under `/api/theory-sessions`. */
export async function theorySessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/theory-sessions", {
    schema: {
      tags: ["theory-sessions"],
    },
  }, async () => listTheorySessions());

  app.get("/api/theory-sessions/:id", {
    schema: {
      tags: ["theory-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getTheorySession(idOf(req));
    if (!session) return notFound(reply, "Theory session");
    return session;
  });

  app.post("/api/theory-sessions", {
    schema: {
      tags: ["theory-sessions"],
      body: createSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateTheorySessionInput;
    const created = await createTheorySession(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/theory-sessions/:id", {
    schema: {
      tags: ["theory-sessions"],
      params: idParams,
      body: updateSessionBody,
    },
  }, async (req, reply) => {
    const updated = await updateTheorySession(idOf(req), req.body as UpdateTheorySessionInput);
    if (!updated) return notFound(reply, "Theory session");
    return updated;
  });

  app.delete("/api/theory-sessions/:id", {
    schema: {
      tags: ["theory-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteTheorySession(idOf(req));
    if (!deleted) return notFound(reply, "Theory session");
    return reply.code(204).send();
  });
}
