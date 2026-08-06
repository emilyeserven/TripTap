import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams } from "@/routes/schemas/params";
import type { CreateRuleGroupInput, UpdateRuleGroupInput } from "@sentence-bank/types";
import { MAX_GROUP_PAIRS, MIN_GROUP_PAIRS } from "@sentence-bank/types";
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

const contrastSideSchema = {
  type: "object",
  additionalProperties: false,
  required: ["jp", "en"],
  properties: {
    jp: {
      type: "string",
    },
    en: {
      type: "string",
    },
  },
} as const;

const itemsSchema = {
  type: "array",
  minItems: MIN_GROUP_PAIRS,
  maxItems: MAX_GROUP_PAIRS,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "a", "b", "options"],
    properties: {
      id: {
        type: "string",
      },
      a: contrastSideSchema,
      b: contrastSideSchema,
      // Both options on the front — the discrimination point (spec §6 inv.4).
      options: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "string",
        },
      },
    },
  },
} as const;

const statusEnum = ["proposed", "active", "suspended"] as const;

const createRuleGroupBody = {
  type: "object",
  required: ["ruleTagKey", "axis", "items"],
  additionalProperties: false,
  properties: {
    ruleTagKey: {
      type: "string",
      minLength: 1,
    },
    // A single named axis (spec §6 inv.10) — structurally forced alongside a/b/options above.
    axis: {
      type: "string",
      minLength: 1,
    },
    items: itemsSchema,
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
  },
} as const;

const updateRuleGroupBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    axis: {
      type: "string",
      minLength: 1,
    },
    items: itemsSchema,
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
