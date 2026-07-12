import type { FastifyInstance } from "fastify";
import type { UpdateBookmarksSettingsInput, UpdateOcrSettingsInput } from "@sentence-bank/types";
import {
  getBookmarksSettings,
  getOcrSettings,
  updateBookmarksSettings,
  updateOcrSettings,
} from "@/services/settings";

const updateOcrSettingsBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ocrSpaceApiKey: {
      type: ["string", "null"],
    },
    googleVisionApiKey: {
      type: ["string", "null"],
    },
  },
} as const;

const bookmarksSourceSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["kind", "id", "label"],
  properties: {
    kind: {
      type: "string",
      enum: ["tag", "taxonomy"],
    },
    id: {
      type: "string",
    },
    label: {
      type: "string",
    },
    termId: {
      type: ["string", "null"],
    },
    termLabel: {
      type: ["string", "null"],
    },
  },
} as const;

const updateBookmarksSettingsBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    endpointUrl: {
      type: ["string", "null"],
    },
    source: bookmarksSourceSchema,
    grammarSource: bookmarksSourceSchema,
    generalSource: bookmarksSourceSchema,
  },
} as const;

/**
 * Settings routes, mounted under `/api/settings`. Cloud OCR credentials are stored server-side; the
 * GET endpoint returns only a masked view (presence + a short hint), never the raw secrets.
 */
export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/settings/ocr", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getOcrSettings());

  app.patch("/api/settings/ocr", {
    schema: {
      tags: ["settings"],
      body: updateOcrSettingsBody,
    },
  }, async (req) => {
    return updateOcrSettings(req.body as UpdateOcrSettingsInput);
  });

  app.get("/api/settings/bookmarks", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getBookmarksSettings());

  app.patch("/api/settings/bookmarks", {
    schema: {
      tags: ["settings"],
      body: updateBookmarksSettingsBody,
    },
  }, async (req) => {
    return updateBookmarksSettings(req.body as UpdateBookmarksSettingsInput);
  });
}
