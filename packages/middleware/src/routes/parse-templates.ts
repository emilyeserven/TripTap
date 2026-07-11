import type { FastifyInstance } from "fastify";
import type { CreateParseTemplateInput } from "@sentence-bank/types";
import {
  createParseTemplate,
  deleteParseTemplate,
  listParseTemplates,
} from "@/services/parse-templates";

const templateParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const createTemplateBody = {
  type: "object",
  required: ["name", "target", "body", "boundary", "ignoreBlankLines"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    target: {
      type: "string",
      enum: ["sentence", "vocab"],
    },
    body: {
      type: "string",
    },
    boundary: {
      type: "string",
      enum: ["fixed", "blank"],
    },
    ignoreBlankLines: {
      type: "boolean",
    },
  },
} as const;

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
      params: templateParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteParseTemplate(id);
    if (!deleted) return reply.code(404).send({
      message: "Template not found",
    });
    return reply.code(204).send();
  });
}
