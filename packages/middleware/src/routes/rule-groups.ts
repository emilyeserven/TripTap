import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams } from "@/routes/schemas/params";
import type { CreateRuleGroupInput, UpdateRuleGroupInput } from "@sentence-bank/types";
import { createRuleGroupJsonSchema } from "@sentence-bank/types";
import {
  createRuleGroup,
  deleteRuleGroup,
  DuplicateGroupError,
  getRuleGroup,
  GroupSizeError,
  listRuleGroups,
  RecurrenceGateError,
  updateRuleGroup,
} from "@/services/rule-groups";

const statusEnum = ["proposed", "active", "suspended"] as const;

const createRuleGroupBody = createRuleGroupJsonSchema;

const updateRuleGroupBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    axis: {
      type: "string",
      minLength: 1,
    },
    // Same shape as the create body, which is the generated one — not a second copy.
    items: createRuleGroupJsonSchema.properties.items,
    seedCorrectionIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
    status: {
      type: "string",
      enum: statusEnum,
    },
    exportedAt: {
      type: ["string", "null"],
    },
    suspendedAt: {
      type: ["string", "null"],
    },
  },
} as const;

/** CRUD routes for rule groups, mounted under `/api/rule-groups`. */
export async function ruleGroupsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/rule-groups", {
    schema: {
      tags: ["rule-groups"],
    },
  }, async () => listRuleGroups());

  app.get("/api/rule-groups/:id", {
    schema: {
      tags: ["rule-groups"],
      params: idParams,
    },
  }, async (req, reply) => {
    const group = await getRuleGroup(idOf(req));
    if (!group) return notFound(reply, "Rule group");
    return group;
  });

  app.post("/api/rule-groups", {
    schema: {
      tags: ["rule-groups"],
      body: createRuleGroupBody,
    },
  }, async (req, reply) => {
    try {
      const created = await createRuleGroup(req.body as CreateRuleGroupInput);
      return reply.code(201).send(created);
    }
    catch (err) {
      if (err instanceof RecurrenceGateError || err instanceof GroupSizeError) {
        return reply.code(400).send({
          message: err.message,
        });
      }
      if (err instanceof DuplicateGroupError) return reply.code(409).send({
        message: err.message,
      });
      throw err;
    }
  });

  app.patch("/api/rule-groups/:id", {
    schema: {
      tags: ["rule-groups"],
      params: idParams,
      body: updateRuleGroupBody,
    },
  }, async (req, reply) => {
    try {
      const updated = await updateRuleGroup(idOf(req), req.body as UpdateRuleGroupInput);
      if (!updated) return notFound(reply, "Rule group");
      return updated;
    }
    catch (err) {
      if (err instanceof GroupSizeError) return reply.code(400).send({
        message: err.message,
      });
      throw err;
    }
  });

  app.delete("/api/rule-groups/:id", {
    schema: {
      tags: ["rule-groups"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteRuleGroup(idOf(req));
    if (!deleted) return notFound(reply, "Rule group");
    return reply.code(204).send();
  });
}
