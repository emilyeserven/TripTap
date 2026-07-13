import type { FastifyInstance } from "fastify";
import type { CreateWritingPromptInput, UpdateWritingPromptInput } from "@sentence-bank/types";
import { WRITING_PROMPT_DIFFICULTIES } from "@sentence-bank/types";
import {
  createWritingPrompt,
  createWritingPromptsMany,
  deleteWritingPrompt,
  getWritingPrompt,
  listWritingPrompts,
  updateWritingPrompt,
} from "@/services/writing-prompts";

const writingPromptParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const createWritingPromptBody = {
  type: "object",
  required: ["text"],
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      minLength: 1,
    },
    textEn: {
      type: ["string", "null"],
    },
    difficulty: {
      type: "string",
      enum: WRITING_PROMPT_DIFFICULTIES,
    },
  },
} as const;

const updateWritingPromptBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createWritingPromptBody.properties,
  },
} as const;

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
      params: writingPromptParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const prompt = await getWritingPrompt(id);
    if (!prompt) return reply.code(404).send({
      message: "Writing prompt not found",
    });
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
        params: writingPromptParams,
        body: updateWritingPromptBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updateWritingPrompt(id, req.body as UpdateWritingPromptInput);
      if (!updated) return reply.code(404).send({
        message: "Writing prompt not found",
      });
      return updated;
    },
  );

  app.delete("/api/writing-prompts/:id", {
    schema: {
      tags: ["writing-prompts"],
      params: writingPromptParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteWritingPrompt(id);
    if (!deleted) return reply.code(404).send({
      message: "Writing prompt not found",
    });
    return reply.code(204).send();
  });
}
