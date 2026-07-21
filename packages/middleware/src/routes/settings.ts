import type { FastifyInstance } from "fastify";
import type {
  UpdateBookmarksSettingsInput,
  UpdateDictionarySettingsInput,
  UpdateLearnerProfileInput,
  UpdateOcrSettingsInput,
  UpdateRenshuuSettingsInput,
  UpdateStartSettingsInput,
  UpdateXpSettingsInput,
} from "@sentence-bank/types";
import {
  getBookmarksSettings,
  getDictionarySettings,
  getLearnerProfile,
  getOcrSettings,
  getRenshuuSettings,
  getStartSettings,
  getXpSettings,
  updateBookmarksSettings,
  updateDictionarySettings,
  updateLearnerProfile,
  updateOcrSettings,
  updateRenshuuSettings,
  updateStartSettings,
  updateXpSettings,
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

/** One mapped tag: `{ id, name }`. Shared by the learning-area and material-type maps. */
const mappedTagSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name"],
  properties: {
    id: {
      type: "string",
    },
    name: {
      type: "string",
    },
  },
} as const;

/** The learning-area → tag map: keys are learning areas, values are `{ id, name }`. */
const learningAreaTagsSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    Speaking: mappedTagSchema,
    Listening: mappedTagSchema,
    Reading: mappedTagSchema,
    Writing: mappedTagSchema,
    Grammar: mappedTagSchema,
    Vocabulary: mappedTagSchema,
  },
} as const;

/** The material-type → tag map: keys are material types, values are `{ id, name }`. */
const materialTypeTagsSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    "Graded": mappedTagSchema,
    "Native": mappedTagSchema,
    "Sequential Material": mappedTagSchema,
    "Out-of-Order OK": mappedTagSchema,
  },
} as const;

/** The drill-tag → tag map: keys are drill tags, values are `{ id, name }`. */
const drillTagsSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    Drills: mappedTagSchema,
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
    learningAreaTags: learningAreaTagsSchema,
    materialTypeTags: materialTypeTagsSchema,
    drillTags: drillTagsSchema,
  },
} as const;

const updateRenshuuSettingsBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    apiKey: {
      type: ["string", "null"],
    },
  },
} as const;

/** A borrowed bookmark term reference on a goal (same shape the sentence forms store). */
const goalTermSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "kind", "sourceId", "sourceLabel"],
  properties: {
    id: {
      type: "string",
    },
    name: {
      type: "string",
    },
    kind: {
      type: "string",
      enum: ["tag", "taxonomy"],
    },
    sourceId: {
      type: "string",
    },
    sourceLabel: {
      type: "string",
    },
    category: {
      type: "string",
      enum: ["vocabulary", "grammar", "general", "resource"],
    },
  },
} as const;

const learnerGoalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "learningAreas", "grammarTerms", "resourceTerms"],
  properties: {
    id: {
      type: "string",
    },
    title: {
      type: "string",
      minLength: 1,
    },
    notes: {
      type: ["string", "null"],
    },
    learningAreas: {
      type: "array",
      items: {
        type: "string",
        enum: ["Speaking", "Listening", "Reading", "Writing", "Grammar", "Vocabulary"],
      },
    },
    grammarTerms: {
      type: "array",
      items: goalTermSchema,
    },
    resourceTerms: {
      type: "array",
      items: goalTermSchema,
    },
  },
} as const;

const updateLearnerProfileBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    goals: {
      type: ["array", "null"],
      maxItems: 3,
      items: learnerGoalSchema,
    },
    dailyXpGoal: {
      type: ["number", "null"],
      minimum: 0,
    },
  },
} as const;

const learningAreaEnum = [
  "Speaking",
  "Listening",
  "Reading",
  "Writing",
  "Grammar",
  "Vocabulary",
] as const;

/** A snapshotted router-link params/search record: string values only. */
const stringRecordSchema = {
  type: "object",
  additionalProperties: {
    type: "string",
  },
} as const;

const lineupItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "kind", "title", "to", "done"],
  properties: {
    id: {
      type: "string",
    },
    kind: {
      type: "string",
      enum: ["due-sheet", "area", "starred-grammar", "goal"],
    },
    area: {
      type: ["string", "null"],
      enum: [...learningAreaEnum, null],
    },
    title: {
      type: "string",
      minLength: 1,
    },
    description: {
      type: ["string", "null"],
    },
    to: {
      type: "string",
      minLength: 1,
    },
    params: stringRecordSchema,
    search: stringRecordSchema,
    resourceId: {
      type: "string",
    },
    sectionId: {
      type: "string",
    },
    done: {
      type: "boolean",
    },
  },
} as const;

const updateStartSettingsBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    favoriteResourceIds: {
      type: ["array", "null"],
      items: {
        type: "string",
      },
    },
    lineup: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["date", "items", "exclusions"],
      properties: {
        date: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        items: {
          type: "array",
          items: lineupItemSchema,
        },
        exclusions: {
          type: "object",
          additionalProperties: false,
          required: ["mediaTypes", "sessionTypes", "learningAreas"],
          properties: {
            mediaTypes: {
              type: "array",
              items: {
                type: "string",
              },
            },
            sessionTypes: {
              type: "array",
              items: {
                type: "string",
                enum: ["reading", "listening", "shadowing", "writing", "drills", "practice"],
              },
            },
            learningAreas: {
              type: "array",
              items: {
                type: "string",
                enum: learningAreaEnum,
              },
            },
            complexityMin: {
              type: ["number", "null"],
            },
            complexityMax: {
              type: ["number", "null"],
            },
          },
        },
      },
    },
  },
} as const;

/** Per-rate override: a non-negative number, or null to reset to the default. */
const xpRateValueSchema = {
  type: ["number", "null"],
  minimum: 0,
} as const;

const updateXpSettingsBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    rates: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        readingTranslatedSentence: xpRateValueSchema,
        readingWordNote: xpRateValueSchema,
        writingSentence: xpRateValueSchema,
        writingCorrection: xpRateValueSchema,
        questionSheetAuthored: xpRateValueSchema,
        answerEntryList: xpRateValueSchema,
        answerEntryGrid: xpRateValueSchema,
        listeningEntry: xpRateValueSchema,
        listeningPassiveMinute: xpRateValueSchema,
        shadowingLoop: xpRateValueSchema,
        drillQuestion: xpRateValueSchema,
        lessonLine: xpRateValueSchema,
        lessonWordNote: xpRateValueSchema,
        theoryStudyPageDense: xpRateValueSchema,
        theoryStudyPageMedium: xpRateValueSchema,
        theoryStudyPageLight: xpRateValueSchema,
        theoryStudyPer250Words: xpRateValueSchema,
        theoryStudyNote: xpRateValueSchema,
      },
    },
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

  app.get("/api/settings/renshuu", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getRenshuuSettings());

  app.patch("/api/settings/renshuu", {
    schema: {
      tags: ["settings"],
      body: updateRenshuuSettingsBody,
    },
  }, async (req) => {
    return updateRenshuuSettings(req.body as UpdateRenshuuSettingsInput);
  });

  app.get("/api/settings/profile", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getLearnerProfile());

  app.patch("/api/settings/profile", {
    schema: {
      tags: ["settings"],
      body: updateLearnerProfileBody,
    },
  }, async (req) => {
    return updateLearnerProfile(req.body as UpdateLearnerProfileInput);
  });

  app.get("/api/settings/start", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getStartSettings());

  app.patch("/api/settings/start", {
    schema: {
      tags: ["settings"],
      body: updateStartSettingsBody,
    },
  }, async (req) => {
    return updateStartSettings(req.body as UpdateStartSettingsInput);
  });

  app.get("/api/settings/xp", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getXpSettings());

  app.patch("/api/settings/xp", {
    schema: {
      tags: ["settings"],
      body: updateXpSettingsBody,
    },
  }, async (req) => {
    return updateXpSettings(req.body as UpdateXpSettingsInput);
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
