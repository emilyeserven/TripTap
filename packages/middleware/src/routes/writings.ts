import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type { CreateWritingInput, UpdateWritingInput } from "@sentence-bank/types";
import { createWritingJsonSchema } from "@sentence-bank/types";
import {
  createWriting,
  deleteWriting,
  getWriting,
  listWritings,
  updateWriting,
} from "@/services/writings";

const createWritingBody = createWritingJsonSchema;

const updateWritingBody = updateBodyOf(createWritingBody);

/** CRUD routes for writings (free-form learner writing), mounted under `/api/writings`. */
export async function writingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/writings", {
    schema: {
      tags: ["writings"],
    },
  }, async () => listWritings());

  app.get("/api/writings/:id", {
    schema: {
      tags: ["writings"],
      params: idParams,
    },
  }, async (req, reply) => {
    const writing = await getWriting(idOf(req));
    if (!writing) return notFound(reply, "Writing");
    return writing;
  });

  app.post("/api/writings", {
    schema: {
      tags: ["writings"],
      body: createWritingBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateWritingInput;
    const created = await createWriting(input);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/writings/:id",
    {
      schema: {
        tags: ["writings"],
        params: idParams,
        body: updateWritingBody,
      },
    },
    async (req, reply) => {
      const updated = await updateWriting(idOf(req), req.body as UpdateWritingInput);
      if (!updated) return notFound(reply, "Writing");
      return updated;
    },
  );

  app.delete("/api/writings/:id", {
    schema: {
      tags: ["writings"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteWriting(idOf(req));
    if (!deleted) return notFound(reply, "Writing");
    return reply.code(204).send();
  });
}
