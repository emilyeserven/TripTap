import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import type { CreateSourceInput, UpdateSourceInput } from "@sentence-bank/types";
import { createSourceJsonSchema } from "@sentence-bank/types";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import { createSource, deleteSource, listSources, updateSource } from "@/services/sources";

const createSourceBody = createSourceJsonSchema;

const updateSourceBody = updateBodyOf(createSourceBody);

/** Routes for the source taxonomy, mounted under `/api/sources`. */
export async function sourceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/sources", {
    schema: {
      tags: ["sources"],
    },
  }, async () => listSources());

  app.post("/api/sources", {
    schema: {
      tags: ["sources"],
      body: createSourceBody,
    },
  }, async (req, reply) => {
    const source = await createSource(req.body as CreateSourceInput);
    return reply.code(201).send(source);
  });

  app.patch("/api/sources/:id", {
    schema: {
      tags: ["sources"],
      params: idParams,
      body: updateSourceBody,
    },
  }, async (req, reply) => {
    const source = await updateSource(idOf(req), req.body as UpdateSourceInput);
    if (!source) return notFound(reply, "Source");
    return source;
  });

  app.delete("/api/sources/:id", {
    schema: {
      tags: ["sources"],
      params: idParams,
    },
  }, async (req, reply) => {
    const ok = await deleteSource(idOf(req));
    if (!ok) return notFound(reply, "Source");
    return reply.code(204).send();
  });
}
