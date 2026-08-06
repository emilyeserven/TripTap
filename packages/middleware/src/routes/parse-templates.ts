import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams } from "@/routes/schemas/params";
import type { CreateParseTemplateInput } from "@sentence-bank/types";
import { createParseTemplateJsonSchema } from "@sentence-bank/types";
import {
  createParseTemplate,
  deleteParseTemplate,
  listParseTemplates,
} from "@/services/parse-templates";

const createTemplateBody = createParseTemplateJsonSchema;

/** Routes for saved parse templates, mounted under `/api/parse-templates`. */
export async function parseTemplateRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/parse-templates", {
    schema: {
      tags: ["parse-templates"],
    },
  }, async () => listParseTemplates());

  app.post("/api/parse-templates", {
    schema: {
      tags: ["parse-templates"],
      body: createTemplateBody,
    },
  }, async (req, reply) => {
    const created = await createParseTemplate(req.body as CreateParseTemplateInput);
    return reply.code(201).send(created);
  });

  app.delete("/api/parse-templates/:id", {
    schema: {
      tags: ["parse-templates"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteParseTemplate(idOf(req));
    if (!deleted) return notFound(reply, "Template");
    return reply.code(204).send();
  });
}
