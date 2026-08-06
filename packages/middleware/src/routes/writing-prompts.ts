import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type { CreateWritingPromptInput, UpdateWritingPromptInput } from "@sentence-bank/types";
import { createWritingPromptJsonSchema } from "@sentence-bank/types";
import {
  createWritingPrompt,
  createWritingPromptsMany,
  deleteWritingPrompt,
  getWritingPrompt,
  listWritingPrompts,
  updateWritingPrompt,
} from "@/services/writing-prompts";

const createWritingPromptBody = createWritingPromptJsonSchema;

const updateWritingPromptBody = updateBodyOf(createWritingPromptBody);

const bulkWritingPromptsBody = {
  type: "object",
  required: ["writingPrompts"],
  additionalProperties: false,
  properties: {
    writingPrompts: {
      type: "array",
      items: createWritingPromptBody,
    },
  },
} as const;

/** CRUD routes for writing prompts (reusable free-write ideas), mounted under `/api/writing-prompts`. */
export async function writingPromptRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/writing-prompts", {
    schema: {
      tags: ["writing-prompts"],
    },
  }, async () => listWritingPrompts());

  app.get("/api/writing-prompts/:id", {
    schema: {
      tags: ["writing-prompts"],
      params: idParams,
    },
  }, async (req, reply) => {
    const prompt = await getWritingPrompt(idOf(req));
    if (!prompt) return notFound(reply, "Writing prompt");
    return prompt;
  });

  app.post("/api/writing-prompts", {
    schema: {
      tags: ["writing-prompts"],
      body: createWritingPromptBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateWritingPromptInput;
    const created = await createWritingPrompt(input);
    return reply.code(201).send(created);
  });

  app.post("/api/writing-prompts/bulk", {
    schema: {
      tags: ["writing-prompts"],
      body: bulkWritingPromptsBody,
    },
  }, async (req, reply) => {
    const {
      writingPrompts: inputs,
    } = req.body as { writingPrompts: CreateWritingPromptInput[] };
    const created = await createWritingPromptsMany(inputs);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/writing-prompts/:id",
    {
      schema: {
        tags: ["writing-prompts"],
        params: idParams,
        body: updateWritingPromptBody,
      },
    },
    async (req, reply) => {
      const updated = await updateWritingPrompt(idOf(req), req.body as UpdateWritingPromptInput);
      if (!updated) return notFound(reply, "Writing prompt");
      return updated;
    },
  );

  app.delete("/api/writing-prompts/:id", {
    schema: {
      tags: ["writing-prompts"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteWritingPrompt(idOf(req));
    if (!deleted) return notFound(reply, "Writing prompt");
    return reply.code(204).send();
  });
}
