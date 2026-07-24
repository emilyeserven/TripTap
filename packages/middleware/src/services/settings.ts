import { eq, inArray } from "drizzle-orm";
import type {
  BookmarksSettings,
  BookmarksSource,
  DailyLineup,
  DailyTask,
  DailyTaskDone,
  DeferredLineupItem,
  DictionaryProvider,
  DictionarySettings,
  DrillTag,
  LearnerGoal,
  LearnerProfile,
  LearningArea,
  LineupItem,
  LineupSessionType,
  MaterialType,
  OcrSettings,
  RenshuuSettings,
  SentenceTermRef,
  StartSettings,
  StartSuggestionKind,
  TheoryTag,
  UpdateBookmarksSettingsInput,
  UpdateDictionarySettingsInput,
  UpdateLearnerProfileInput,
  UpdateOcrSettingsInput,
  UpdateRenshuuSettingsInput,
  UpdateStartSettingsInput,
  UpdateXpSettingsInput,
  XpRateKey,
  XpRates,
  XpSettings,
} from "@sentence-bank/types";
import {
  DEFAULT_XP_RATES,
  DRILL_TAGS,
  LEARNING_AREAS,
  LINEUP_SESSION_TYPES,
  MATERIAL_TYPES,
  MAX_LEARNER_GOALS,
  THEORY_TAGS,
  XP_RATE_KEYS,
} from "@sentence-bank/types";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Settings keys for cloud OCR credentials. Kept in one place so the OCR config resolver and the
 * settings routes agree on the storage keys.
 */
const OCR_SECRET_KEYS = {
  ocrSpaceApiKey: "ocr.ocrSpace.apiKey",
  googleVisionApiKey: "ocr.googleVision.apiKey",
} as const;

/** Read several settings at once, returning a `key → value` map (absent keys are omitted). */
async function getSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const rows = await db.select().from(settings).where(inArray(settings.key, keys));
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

/**
 * Upsert a setting. A `null` or empty value deletes the row, so "unset" and "stored empty string"
 * never diverge.
 */
async function setSetting(key: string, value: string | null): Promise<void> {
  if (value === null || value === "") {
    await db.delete(settings).where(eq(settings.key, key));
    return;
  }
  await db
    .insert(settings)
    .values({
      key,
      value,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}

/** Last-4-characters hint for a stored secret (used for recognition without exposing the value). */
function hint(value: string | null): string | null {
  if (!value) return null;
  return value.length <= 4 ? value : value.slice(-4);
}

/**
 * Apply one tri-state settings field: `undefined` leaves the stored value unchanged; otherwise the
 * value is serialized and written (with `null`/`""` clearing it). Keeps the many partial-update
 * writers a flat list of one-liners instead of a wall of `if (x !== undefined)` blocks.
 */
async function setFieldIfPresent<T>(
  key: string,
  value: T | undefined,
  serialize: (value: T) => string | null,
): Promise<void> {
  if (value !== undefined) await setSetting(key, serialize(value));
}

/** Serialize a bookmarks source to its stored JSON, or null when unset. */
export function serializeSource(source: BookmarksSource | null): string | null {
  return source ? JSON.stringify(source) : null;
}

/** Serialize a tag map to its stored JSON, or null when it has no entries. */
export function serializeTagMap(map: object | null): string | null {
  return map && Object.keys(map).length > 0 ? JSON.stringify(map) : null;
}

/** The cloud OCR API keys stored in the DB (each `null` when unset). */
export async function getOcrSecrets(): Promise<{
  ocrSpaceApiKey: string | null;
  googleVisionApiKey: string | null;
}> {
  const stored = await getSettings(Object.values(OCR_SECRET_KEYS));
  return {
    ocrSpaceApiKey: stored[OCR_SECRET_KEYS.ocrSpaceApiKey] ?? null,
    googleVisionApiKey: stored[OCR_SECRET_KEYS.googleVisionApiKey] ?? null,
  };
}

/** Masked view of the stored cloud OCR keys for the Settings UI — never exposes raw secrets. */
export async function getOcrSettings(): Promise<OcrSettings> {
  const secrets = await getOcrSecrets();
  return {
    ocrSpace: {
      configured: Boolean(secrets.ocrSpaceApiKey),
      hint: hint(secrets.ocrSpaceApiKey),
    },
    googleVision: {
      configured: Boolean(secrets.googleVisionApiKey),
      hint: hint(secrets.googleVisionApiKey),
    },
  };
}

/**
 * Apply a partial update to the stored cloud OCR keys. Each field is tri-state: `undefined` leaves
 * the value unchanged, `""`/`null` clears it, any other string replaces it. Returns the new masked
 * view.
 */
export async function updateOcrSettings(input: UpdateOcrSettingsInput): Promise<OcrSettings> {
  if (input.ocrSpaceApiKey !== undefined) {
    await setSetting(OCR_SECRET_KEYS.ocrSpaceApiKey, input.ocrSpaceApiKey?.trim() ?? null);
  }
  if (input.googleVisionApiKey !== undefined) {
    await setSetting(OCR_SECRET_KEYS.googleVisionApiKey, input.googleVisionApiKey?.trim() ?? null);
  }
  return getOcrSettings();
}

/**
 * Settings keys for the external bookmarks tag/taxonomy integration. The chosen source is stored as a
 * JSON-encoded {@link BookmarksSource}. Neither value is a secret.
 */
const BOOKMARKS_KEYS = {
  endpointUrl: "bookmarks.endpointUrl",
  source: "bookmarks.source",
  grammarSource: "bookmarks.grammarSource",
  generalSource: "bookmarks.generalSource",
  resourceSource: "bookmarks.resourceSource",
  learningAreaTags: "bookmarks.learningAreaTags",
  materialTypeTags: "bookmarks.materialTypeTags",
  drillTags: "bookmarks.drillTags",
  theoryTags: "bookmarks.theoryTags",
} as const;

/**
 * Parse a stored `{ key: { id, name } }` tag map, keeping only the given known keys whose entry is a
 * valid `{id, name}` tag. Backs both the learning-area and material-type maps. Corrupt JSON → empty.
 */
function parseTagMap<K extends string>(raw: string | null, keys: readonly K[]): Partial<Record<K, { id: string;
  name: string; }>> {
  const out: Partial<Record<K, { id: string;
    name: string; }>> = {};
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of keys) {
      const entry = parsed[key];
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (typeof e.id === "string" && typeof e.name === "string") {
          out[key] = {
            id: e.id,
            name: e.name,
          };
        }
      }
    }
  }
  catch {
    // Corrupt value — treat as unset.
  }
  return out;
}

/** Optional `termId`/`termLabel` off a stored source: keep only when a string or explicit null. */
function parseTermField(value: unknown): string | null | undefined {
  if (value === null || typeof value === "string") return value;
  return undefined;
}

/** Parse a stored {@link BookmarksSource} JSON string, tolerating absent/corrupt values. */
function parseBookmarksSource(raw: string | null): BookmarksSource | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BookmarksSource;
    if (
      parsed
      && (parsed.kind === "tag" || parsed.kind === "taxonomy")
      && typeof parsed.id === "string"
      && typeof parsed.label === "string"
    ) {
      return {
        kind: parsed.kind,
        id: parsed.id,
        label: parsed.label,
        termId: parseTermField(parsed.termId),
        termLabel: parseTermField(parsed.termLabel),
      };
    }
    return null;
  }
  catch {
    return null;
  }
}

/** The bookmarks integration settings stored in the DB (raw values; these are not secrets). */
export async function getBookmarksSettings(): Promise<BookmarksSettings> {
  const stored = await getSettings(Object.values(BOOKMARKS_KEYS));
  return {
    endpointUrl: stored[BOOKMARKS_KEYS.endpointUrl] ?? null,
    source: parseBookmarksSource(stored[BOOKMARKS_KEYS.source] ?? null),
    grammarSource: parseBookmarksSource(stored[BOOKMARKS_KEYS.grammarSource] ?? null),
    generalSource: parseBookmarksSource(stored[BOOKMARKS_KEYS.generalSource] ?? null),
    resourceSource: parseBookmarksSource(stored[BOOKMARKS_KEYS.resourceSource] ?? null),
    learningAreaTags: parseTagMap<LearningArea>(stored[BOOKMARKS_KEYS.learningAreaTags] ?? null, LEARNING_AREAS),
    materialTypeTags: parseTagMap<MaterialType>(stored[BOOKMARKS_KEYS.materialTypeTags] ?? null, MATERIAL_TYPES),
    drillTags: parseTagMap<DrillTag>(stored[BOOKMARKS_KEYS.drillTags] ?? null, DRILL_TAGS),
    theoryTags: parseTagMap<TheoryTag>(stored[BOOKMARKS_KEYS.theoryTags] ?? null, THEORY_TAGS),
  };
}

/**
 * Apply a partial update to the bookmarks integration settings. Each field is tri-state: `undefined`
 * leaves the value unchanged, `""`/`null` clears it, any other value replaces it. Returns the new view.
 */
export async function updateBookmarksSettings(
  input: UpdateBookmarksSettingsInput,
): Promise<BookmarksSettings> {
  await setFieldIfPresent(BOOKMARKS_KEYS.endpointUrl, input.endpointUrl, v => v?.trim() ?? null);
  await setFieldIfPresent(BOOKMARKS_KEYS.source, input.source, serializeSource);
  await setFieldIfPresent(BOOKMARKS_KEYS.grammarSource, input.grammarSource, serializeSource);
  await setFieldIfPresent(BOOKMARKS_KEYS.generalSource, input.generalSource, serializeSource);
  await setFieldIfPresent(BOOKMARKS_KEYS.resourceSource, input.resourceSource, serializeSource);
  await setFieldIfPresent(BOOKMARKS_KEYS.learningAreaTags, input.learningAreaTags, serializeTagMap);
  await setFieldIfPresent(BOOKMARKS_KEYS.materialTypeTags, input.materialTypeTags, serializeTagMap);
  await setFieldIfPresent(BOOKMARKS_KEYS.drillTags, input.drillTags, serializeTagMap);
  await setFieldIfPresent(BOOKMARKS_KEYS.theoryTags, input.theoryTags, serializeTagMap);
  return getBookmarksSettings();
}

/**
 * Settings keys for the Japanese dictionary lookup integration. Neither value is a secret: the base URL
 * of the upstream (Jisho or a self-hosted Jotoba) and the chosen provider.
 */
const DICTIONARY_KEYS = {
  endpointUrl: "dictionary.endpointUrl",
  provider: "dictionary.provider",
} as const;

/** Coerce a stored provider string to a known provider, or null when absent/unrecognized. */
function parseProvider(raw: string | null): DictionaryProvider | null {
  return raw === "jisho" || raw === "jotoba" ? raw : null;
}

/** The dictionary integration settings stored in the DB (raw values; these are not secrets). */
export async function getDictionarySettings(): Promise<DictionarySettings> {
  const stored = await getSettings(Object.values(DICTIONARY_KEYS));
  return {
    endpointUrl: stored[DICTIONARY_KEYS.endpointUrl] ?? null,
    provider: parseProvider(stored[DICTIONARY_KEYS.provider] ?? null),
  };
}

/**
 * Apply a partial update to the dictionary integration settings. Each field is tri-state: `undefined`
 * leaves the value unchanged, `""`/`null` clears it (reverting to env/default), any other value
 * replaces it. Returns the new view.
 */
export async function updateDictionarySettings(
  input: UpdateDictionarySettingsInput,
): Promise<DictionarySettings> {
  if (input.endpointUrl !== undefined) {
    await setSetting(DICTIONARY_KEYS.endpointUrl, input.endpointUrl?.trim() ?? null);
  }
  if (input.provider !== undefined) {
    await setSetting(DICTIONARY_KEYS.provider, input.provider ?? null);
  }
  return getDictionarySettings();
}

/** Settings key holding the learner profile's goals as one JSON-encoded array. Not a secret. */
const PROFILE_GOALS_KEY = "profile.goals";

/** Keep only well-formed {@link SentenceTermRef}s from a stored goal's term array. */
function parseGoalTerms(value: unknown): SentenceTermRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter((term): term is SentenceTermRef => {
    if (!term || typeof term !== "object") return false;
    const t = term as Record<string, unknown>;
    return typeof t.id === "string" && typeof t.name === "string";
  });
}

/**
 * Parse the stored goals JSON, tolerating absent/corrupt values like the other settings parsers:
 * malformed goals are dropped, unknown learning areas are filtered out, and the list is clamped to
 * {@link MAX_LEARNER_GOALS}.
 */
function parseLearnerGoals(raw: string | null): LearnerGoal[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((goal): goal is Record<string, unknown> => Boolean(goal) && typeof goal === "object")
      .filter(goal => typeof goal.id === "string" && typeof goal.title === "string")
      .map(goal => ({
        id: goal.id as string,
        title: goal.title as string,
        notes: typeof goal.notes === "string" ? goal.notes : null,
        learningAreas: Array.isArray(goal.learningAreas)
          ? goal.learningAreas.filter((area): area is LearningArea =>
            (LEARNING_AREAS as readonly string[]).includes(area as string))
          : [],
        grammarTerms: parseGoalTerms(goal.grammarTerms),
        resourceTerms: parseGoalTerms(goal.resourceTerms),
      }))
      .slice(0, MAX_LEARNER_GOALS);
  }
  catch {
    return [];
  }
}

/** Settings key holding the minimum XP the learner wants to earn each day. Not a secret. */
const PROFILE_DAILY_XP_GOAL_KEY = "profile.dailyXpGoal";

/** Parse the stored daily goal: a finite positive number, else unset. */
function parseDailyXpGoal(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Settings key holding the hour a new day starts for XP/activity counting. Not a secret. */
const PROFILE_DAY_START_HOUR_KEY = "profile.dayStartHour";

/** Parse the stored day-start hour: an integer clamped to 0–23, defaulting to 0 (midnight). */
function parseDayStartHour(raw: string | null): number {
  if (!raw) return 0;
  const value = Math.floor(Number(raw));
  if (!Number.isFinite(value)) return 0;
  return Math.min(23, Math.max(0, value));
}

/** The learner profile stored in the DB (empty goals / no daily goal when unset). */
export async function getLearnerProfile(): Promise<LearnerProfile> {
  const stored = await getSettings([
    PROFILE_GOALS_KEY,
    PROFILE_DAILY_XP_GOAL_KEY,
    PROFILE_DAY_START_HOUR_KEY,
  ]);
  return {
    goals: parseLearnerGoals(stored[PROFILE_GOALS_KEY] ?? null),
    dailyXpGoal: parseDailyXpGoal(stored[PROFILE_DAILY_XP_GOAL_KEY] ?? null),
    dayStartHour: parseDayStartHour(stored[PROFILE_DAY_START_HOUR_KEY] ?? null),
  };
}

/**
 * Apply a partial update to the learner profile. Tri-state per field: `undefined` leaves a value
 * unchanged; `null`/`[]`/`0` clears it. Returns the new view.
 */
export async function updateLearnerProfile(
  input: UpdateLearnerProfileInput,
): Promise<LearnerProfile> {
  if (input.goals !== undefined) {
    const goals = input.goals?.slice(0, MAX_LEARNER_GOALS) ?? [];
    await setSetting(PROFILE_GOALS_KEY, goals.length > 0 ? JSON.stringify(goals) : null);
  }
  if (input.dailyXpGoal !== undefined) {
    await setSetting(
      PROFILE_DAILY_XP_GOAL_KEY,
      input.dailyXpGoal && input.dailyXpGoal > 0 ? String(input.dailyXpGoal) : null,
    );
  }
  if (input.dayStartHour !== undefined) {
    // Clamp to 0–23; null or 0 (midnight, the default) clears the row.
    const hour = input.dayStartHour == null ? 0 : Math.min(23, Math.max(0, Math.floor(input.dayStartHour)));
    await setSetting(PROFILE_DAY_START_HOUR_KEY, hour > 0 ? String(hour) : null);
  }
  return getLearnerProfile();
}

/** Settings keys for the Start Something page: local resource favorites, the daily lineup, deferrals. */
const START_KEYS = {
  favoriteResourceIds: "start.favoriteResourceIds",
  lineup: "start.lineup",
  deferred: "start.deferred",
  dailyTasks: "start.dailyTasks",
  dailyTaskDone: "start.dailyTaskDone",
} as const;

/** Parse the stored favorite ids: a JSON array of strings, corrupt → empty. */
export function parseFavoriteResourceIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  }
  catch {
    return [];
  }
}

/** Keep only string-valued entries of a snapshotted params/search record. */
function parseStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string");
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

// Keep in sync with StartSuggestionKind; "custom" is a learner-authored lineup item.
const SUGGESTION_KINDS = ["due-sheet", "area", "starred-grammar", "goal", "custom"] as const;

/**
 * Parse the stored lineup, tolerating absent/corrupt values: malformed items are dropped, exclusion
 * arrays are filtered to known values (media types are free-form upstream names), and anything
 * without a valid date is treated as unset. Staleness (date ≠ today) is a client concern.
 */
/** True for a well-formed lineup item object (before mapping). */
function isLineupItemShape(item: unknown): item is Record<string, unknown> {
  return Boolean(item)
    && typeof item === "object"
    && typeof (item as Record<string, unknown>).id === "string"
    && typeof (item as Record<string, unknown>).title === "string"
    && typeof (item as Record<string, unknown>).to === "string"
    && (SUGGESTION_KINDS as readonly string[]).includes((item as Record<string, unknown>).kind as string);
}

/** Map a validated raw item object to a {@link LineupItem}, coercing/defaulting defensively. */
function mapLineupItem(item: Record<string, unknown>): LineupItem {
  return {
    id: item.id as string,
    kind: item.kind as StartSuggestionKind,
    area: (LEARNING_AREAS as readonly string[]).includes(item.area as string)
      ? item.area as LearningArea
      : null,
    title: item.title as string,
    description: typeof item.description === "string" ? item.description : null,
    to: item.to as string,
    params: parseStringRecord(item.params),
    search: parseStringRecord(item.search),
    resourceId: typeof item.resourceId === "string" ? item.resourceId : undefined,
    sectionId: typeof item.sectionId === "string" ? item.sectionId : undefined,
    done: item.done === true,
  };
}

/** Parse the stored deferred/carried-over items, dropping any without a valid `deferredTo` date. */
export function parseDeferredItems(raw: string | null): DeferredLineupItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isLineupItemShape)
      .filter(item => typeof item.deferredTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.deferredTo))
      .map(item => ({
        ...mapLineupItem(item),
        deferredTo: item.deferredTo as string,
      }));
  }
  catch {
    return [];
  }
}

export function parseDailyLineup(raw: string | null): DailyLineup | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return null;
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(isLineupItemShape).map(mapLineupItem)
      : [];
    const exclusions = (parsed.exclusions ?? {}) as Record<string, unknown>;
    return {
      date: parsed.date,
      items,
      exclusions: {
        mediaTypes: Array.isArray(exclusions.mediaTypes)
          ? exclusions.mediaTypes.filter((m): m is string => typeof m === "string")
          : [],
        sessionTypes: Array.isArray(exclusions.sessionTypes)
          ? exclusions.sessionTypes.filter((t): t is LineupSessionType =>
            (LINEUP_SESSION_TYPES as readonly string[]).includes(t as string))
          : [],
        learningAreas: Array.isArray(exclusions.learningAreas)
          ? exclusions.learningAreas.filter((a): a is LearningArea =>
            (LEARNING_AREAS as readonly string[]).includes(a as string))
          : [],
        complexityMin: typeof exclusions.complexityMin === "number" ? exclusions.complexityMin : null,
        complexityMax: typeof exclusions.complexityMax === "number" ? exclusions.complexityMax : null,
      },
    };
  }
  catch {
    return null;
  }
}

/** Parse the stored recurring daily tasks, dropping any malformed entry. */
export function parseDailyTasks(raw: string | null): DailyTask[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === "object")
      .filter(t => typeof t.id === "string" && typeof t.resourceId === "string")
      .map(t => ({
        id: t.id as string,
        resourceId: t.resourceId as string,
        resourceTitle: typeof t.resourceTitle === "string" ? t.resourceTitle : "",
        label: typeof t.label === "string" ? t.label : null,
        area: (LEARNING_AREAS as readonly string[]).includes(t.area as string)
          ? t.area as LearningArea
          : null,
      }));
  }
  catch {
    return [];
  }
}

/** Parse the stored per-day daily-task check-offs, requiring a valid date; corrupt → null. */
export function parseDailyTaskDone(raw: string | null): DailyTaskDone | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return null;
    return {
      date: parsed.date,
      doneIds: Array.isArray(parsed.doneIds)
        ? parsed.doneIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  }
  catch {
    return null;
  }
}

/** The Start Something settings stored in the DB. */
export async function getStartSettings(): Promise<StartSettings> {
  const stored = await getSettings(Object.values(START_KEYS));
  return {
    favoriteResourceIds: parseFavoriteResourceIds(stored[START_KEYS.favoriteResourceIds] ?? null),
    lineup: parseDailyLineup(stored[START_KEYS.lineup] ?? null),
    deferred: parseDeferredItems(stored[START_KEYS.deferred] ?? null),
    dailyTasks: parseDailyTasks(stored[START_KEYS.dailyTasks] ?? null),
    dailyTaskDone: parseDailyTaskDone(stored[START_KEYS.dailyTaskDone] ?? null),
  };
}

/**
 * Apply a partial update to the Start Something settings. Tri-state per field: `undefined` leaves a
 * value unchanged; `null`/`[]` clears it. The lineup is replaced whole (never merged) — the client
 * always sends the full day document.
 */
export async function updateStartSettings(input: UpdateStartSettingsInput): Promise<StartSettings> {
  if (input.favoriteResourceIds !== undefined) {
    const ids = input.favoriteResourceIds ?? [];
    await setSetting(START_KEYS.favoriteResourceIds, ids.length > 0 ? JSON.stringify(ids) : null);
  }
  if (input.lineup !== undefined) {
    await setSetting(START_KEYS.lineup, input.lineup ? JSON.stringify(input.lineup) : null);
  }
  if (input.deferred !== undefined) {
    const items = input.deferred ?? [];
    await setSetting(START_KEYS.deferred, items.length > 0 ? JSON.stringify(items) : null);
  }
  if (input.dailyTasks !== undefined) {
    const tasks = input.dailyTasks ?? [];
    await setSetting(START_KEYS.dailyTasks, tasks.length > 0 ? JSON.stringify(tasks) : null);
  }
  if (input.dailyTaskDone !== undefined) {
    const done = input.dailyTaskDone;
    await setSetting(
      START_KEYS.dailyTaskDone,
      done && done.doneIds.length > 0 ? JSON.stringify(done) : null,
    );
  }
  return getStartSettings();
}

/** Settings key holding the learner's XP-rate overrides as one JSON object. Not a secret. */
const XP_RATES_KEY = "xp.rates";

/** Parse stored overrides, keeping only known rate keys with finite non-negative numbers. */
export function parseXpRateOverrides(raw: string | null): Partial<XpRates> {
  const out: Partial<XpRates> = {};
  if (!raw) return out;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of XP_RATE_KEYS) {
      const value = parsed[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) out[key] = value;
    }
  }
  catch {
    // Corrupt value — treat as unset.
  }
  return out;
}

/** The effective XP rates: the defaults with any stored overrides on top. */
export async function getXpRates(): Promise<XpRates> {
  const stored = await getSettings([XP_RATES_KEY]);
  return {
    ...DEFAULT_XP_RATES,
    ...parseXpRateOverrides(stored[XP_RATES_KEY] ?? null),
  };
}

/** The XP settings view (the effective rates). */
export async function getXpSettings(): Promise<XpSettings> {
  return {
    rates: await getXpRates(),
  };
}

/**
 * Apply a partial update to the XP-rate overrides. Tri-state per key: omitted keys keep their current
 * override, `null` resets a key to its default, a number overrides it; `rates: null` resets all. Only
 * values differing from the default are stored. Because XP is derived, the next summary fetch
 * recalculates everything with the new rates — there is no ledger to migrate.
 */
export async function updateXpSettings(input: UpdateXpSettingsInput): Promise<XpSettings> {
  if (input.rates !== undefined) {
    if (input.rates === null) {
      await setSetting(XP_RATES_KEY, null);
    }
    else {
      const stored = await getSettings([XP_RATES_KEY]);
      const overrides = parseXpRateOverrides(stored[XP_RATES_KEY] ?? null);
      for (const key of XP_RATE_KEYS) {
        const value = input.rates[key as XpRateKey];
        if (value === undefined) continue;
        if (value === null || value === DEFAULT_XP_RATES[key]) delete overrides[key];
        else overrides[key] = value;
      }
      const hasAny = Object.keys(overrides).length > 0;
      await setSetting(XP_RATES_KEY, hasAny ? JSON.stringify(overrides) : null);
    }
  }
  return getXpSettings();
}

/** Settings key for the Renshuu API key. Stored server-side; overrides the `RENSHUU_API_KEY` env var. */
const RENSHUU_SECRET_KEY = "renshuu.apiKey";

/** The Renshuu API key: the DB-stored value, or the `RENSHUU_API_KEY` env fallback, or null. */
export async function getRenshuuApiKey(): Promise<string | null> {
  const stored = await getSettings([RENSHUU_SECRET_KEY]);
  return stored[RENSHUU_SECRET_KEY] ?? process.env.RENSHUU_API_KEY?.trim() ?? null;
}

/** Masked view of the stored Renshuu key for the Settings UI — never exposes the raw secret. */
export async function getRenshuuSettings(): Promise<RenshuuSettings> {
  const key = await getRenshuuApiKey();
  return {
    apiKey: {
      configured: Boolean(key),
      hint: hint(key),
    },
  };
}

/**
 * Apply a partial update to the stored Renshuu key. `apiKey` is tri-state: `undefined` leaves it
 * unchanged, `""`/`null` clears it (reverting to the env fallback), any other string replaces it.
 * Returns the new masked view.
 */
export async function updateRenshuuSettings(
  input: UpdateRenshuuSettingsInput,
): Promise<RenshuuSettings> {
  if (input.apiKey !== undefined) {
    await setSetting(RENSHUU_SECRET_KEY, input.apiKey?.trim() ?? null);
  }
  return getRenshuuSettings();
}
