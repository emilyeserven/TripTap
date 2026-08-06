import type { FastifyInstance } from "fastify";
import { notFound } from "@/routes/handlers";
import type { UpsertRuleTagInput } from "@sentence-bank/types";
import { getRuleTag, listRuleTags, upsertRuleTag } from "@/services/rule-tags";

const ruleTagParams = {
  type: "object",
  required: ["key"],
  properties: {
    key: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

const upsertRuleTagBody = {
  type: "object",
  required: ["key"],
  additionalProperties: false,
  properties: {
    key: {
      type: "string",
      minLength: 1,
    },
    label: {
      type: "string",
    },
    grammarTagId: {
      type: ["string", "null"],
    },
    grammarTagName: {
      type: ["string", "null"],
    },
  },
} as const;

/** CRUD-lite routes for the global rule-tag taxonomy, mounted under `/api/rule-tags`. */
export async function ruleTagsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/rule-tags", {
    schema: {
      tags: ["rule-tags"],
    },
  }, async () => listRuleTags());

  app.get("/api/rule-tags/:key", {
    schema: {
      tags: ["rule-tags"],
      params: ruleTagParams,
    },
  }, async (req, reply) => {
    const {
      key,
    } = req.params as { key: string };
    const tag = await getRuleTag(key);
    if (!tag) return notFound(reply, "Rule tag");
    return tag;
  });

  app.put("/api/rule-tags", {
    schema: {
      tags: ["rule-tags"],
      body: upsertRuleTagBody,
    },
  }, async req => upsertRuleTag(req.body as UpsertRuleTagInput));
}
