import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateReadingSessionInput,
  UpdateReadingSessionInput,
} from "@sentence-bank/types";
import {
  createReadingSession,
  deleteReadingSession,
  getReadingSession,
  listReadingSessions,
  updateReadingSession,
} from "@/services/reading-sessions";
import { createReadingSessionJsonSchema } from "@sentence-bank/types";

const createReadingSessionBody = createReadingSessionJsonSchema;

const updateReadingSessionBody = updateBodyOf(createReadingSessionBody);

/** CRUD routes for reading sessions, mounted under `/api/reading-sessions`. */
export async function readingSessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/reading-sessions", {
    schema: {
      tags: ["reading-sessions"],
    },
  }, async () => listReadingSessions());

  app.get("/api/reading-sessions/:id", {
    schema: {
      tags: ["reading-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getReadingSession(idOf(req));
    if (!session) return notFound(reply, "Reading session");
    return session;
  });

  app.post("/api/reading-sessions", {
    schema: {
      tags: ["reading-sessions"],
      body: createReadingSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateReadingSessionInput;
    const created = await createReadingSession(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/reading-sessions/:id",
    {
      schema: {
        tags: ["reading-sessions"],
        params: idParams,
        body: updateReadingSessionBody,
      },
    },
    async (req, reply) => {
      const updated = await updateReadingSession(idOf(req), req.body as UpdateReadingSessionInput);
      if (!updated) return notFound(reply, "Reading session");
      return updated;
    },
  );

  app.delete("/api/reading-sessions/:id", {
    schema: {
      tags: ["reading-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteReadingSession(idOf(req));
    if (!deleted) return notFound(reply, "Reading session");
    return reply.code(204).send();
  });
}
