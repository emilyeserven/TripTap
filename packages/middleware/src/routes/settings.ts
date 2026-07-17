import type { FastifyInstance } from "fastify";
import type {
  UpdateBookmarksSettingsInput,
  UpdateDictionarySettingsInput,
  UpdateOcrSettingsInput,
} from "@sentence-bank/types";
import {
  getBookmarksSettings,
  getDictionarySettings,
  getOcrSettings,
  updateBookmarksSettings,
  updateDictionarySettings,
  updateOcrSettings,
} from "@/services/settings";
import { mediaStatus, testMediaConnection } from "@/services/media";

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
    resourceSource: bookmarksSourceSchema,
    listeningSource: bookmarksSourceSchema,
  },
} as const;

const updateDictionarySettingsBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    endpointUrl: {
      type: ["string", "null"],
    },
    provider: {
      type: ["string", "null"],
      enum: ["jisho", "jotoba", null],
    },
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

  app.get("/api/settings/media", {
    schema: {
      tags: ["settings"],
    },
  }, async () => mediaStatus());

  app.post("/api/settings/media/test", {
    schema: {
      tags: ["settings"],
    },
  }, async () => testMediaConnection());

  app.get("/api/settings/dictionary", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getDictionarySettings());

  app.patch("/api/settings/dictionary", {
    schema: {
      tags: ["settings"],
      body: updateDictionarySettingsBody,
    },
  }, async (req) => {
    return updateDictionarySettings(req.body as UpdateDictionarySettingsInput);
  });
}
