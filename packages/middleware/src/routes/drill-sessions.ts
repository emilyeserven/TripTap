import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateDrillSessionInput,
  UpdateDrillSessionInput,
} from "@sentence-bank/types";
import { createDrillSessionJsonSchema } from "@sentence-bank/types";
import {
  createDrillSession,
  deleteDrillSession,
  getDrillSession,
  listDrillSessions,
  updateDrillSession,
} from "@/services/drill-sessions";

const createSessionBody = createDrillSessionJsonSchema;

const updateSessionBody = updateBodyOf(createSessionBody);

/** CRUD routes for Drill Buddy sessions (mistake logs), mounted under `/api/drill-sessions`. */
export async function drillSessionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/drill-sessions", {
    schema: {
      tags: ["drill-sessions"],
    },
  }, async () => listDrillSessions());

  app.get("/api/drill-sessions/:id", {
    schema: {
      tags: ["drill-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const session = await getDrillSession(idOf(req));
    if (!session) return notFound(reply, "Drill session");
    return session;
  });

  app.post("/api/drill-sessions", {
    schema: {
      tags: ["drill-sessions"],
      body: createSessionBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateDrillSessionInput;
    const created = await createDrillSession(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/drill-sessions/:id", {
    schema: {
      tags: ["drill-sessions"],
      params: idParams,
      body: updateSessionBody,
    },
  }, async (req, reply) => {
    const updated = await updateDrillSession(idOf(req), req.body as UpdateDrillSessionInput);
    if (!updated) return notFound(reply, "Drill session");
    return updated;
  });

  app.delete("/api/drill-sessions/:id", {
    schema: {
      tags: ["drill-sessions"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteDrillSession(idOf(req));
    if (!deleted) return notFound(reply, "Drill session");
    return reply.code(204).send();
  });
}
