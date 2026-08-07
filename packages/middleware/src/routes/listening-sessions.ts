import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateListeningSessionInput,
  UpdateListeningSessionInput,
} from "@sentence-bank/types";
import {
  createListeningSession,
  deleteListeningSession,
  getListeningSession,
  listListeningSessions,
  updateListeningSession,
} from "@/services/listening-sessions";
import { createListeningSessionJsonSchema } from "@sentence-bank/types";

const createListeningSessionBody = createListeningSessionJsonSchema;

const updateListeningSessionBody = updateBodyOf(createListeningSessionBody);

/** CRUD routes for listening (Listen and Shadow) sessions, mounted under `/api/listening-sessions`. */
export async function listeningSessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/listening-sessions", {
    schema: {
      tags: ["listening-sessions"],
    },
  }, async () => listListeningSessions());

  app.get("/api/listening-sessions/:id", {
    schema: {
      tags: ["listening-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getListeningSession(idOf(req));
    if (!session) return notFound(reply, "Listening session");
    return session;
  });

  app.post("/api/listening-sessions", {
    schema: {
      tags: ["listening-sessions"],
      body: createListeningSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateListeningSessionInput;
    const created = await createListeningSession(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/listening-sessions/:id",
    {
      schema: {
        tags: ["listening-sessions"],
        params: idParams,
        body: updateListeningSessionBody,
      },
    },
    async (req, reply) => {
      const updated = await updateListeningSession(idOf(req), req.body as UpdateListeningSessionInput);
      if (!updated) return notFound(reply, "Listening session");
      return updated;
    },
  );

  app.delete("/api/listening-sessions/:id", {
    schema: {
      tags: ["listening-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteListeningSession(idOf(req));
    if (!deleted) return notFound(reply, "Listening session");
    return reply.code(204).send();
  });
}
