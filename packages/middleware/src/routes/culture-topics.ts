import type { FastifyInstance } from "fastify";
import type {
  CreateCultureTopicInput,
  UpdateCultureTopicInput,
} from "@sentence-bank/types";
import { createCultureTopicJsonSchema } from "@sentence-bank/types";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import {
  createCultureTopic,
  deleteCultureTopic,
  getCultureTopic,
  listCultureTopics,
  updateCultureTopic,
} from "@/services/culture-topics";

const createCultureTopicBody = createCultureTopicJsonSchema;

const updateCultureTopicBody = updateBodyOf(createCultureTopicBody);

/** CRUD routes for the culture-topic taxonomy, mounted under `/api/culture-topics`. */
export async function cultureTopicRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/culture-topics", {
    schema: {
      tags: ["culture-topics"],
    },
  }, async () => listCultureTopics());

  app.get("/api/culture-topics/:id", {
    schema: {
      tags: ["culture-topics"],
      params: idParams,
    },
  }, async (req, reply) => {
    const topic = await getCultureTopic(idOf(req));
    if (!topic) return notFound(reply, "Culture topic");
    return topic;
  });

  app.post("/api/culture-topics", {
    schema: {
      tags: ["culture-topics"],
      body: createCultureTopicBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateCultureTopicInput;
    const created = await createCultureTopic(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/culture-topics/:id", {
    schema: {
      tags: ["culture-topics"],
      params: idParams,
      body: updateCultureTopicBody,
    },
  }, async (req, reply) => {
    const updated = await updateCultureTopic(idOf(req), req.body as UpdateCultureTopicInput);
    if (!updated) return notFound(reply, "Culture topic");
    return updated;
  });

  app.delete("/api/culture-topics/:id", {
    schema: {
      tags: ["culture-topics"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteCultureTopic(idOf(req));
    if (!deleted) return notFound(reply, "Culture topic");
    return reply.code(204).send();
  });
}
