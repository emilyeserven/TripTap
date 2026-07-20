import type {
  BookmarkResource,
  ComplexityScale,
  DrillTag,
  DrillTagMap,
  LearningArea,
  LearningAreaTagMap,
  MaterialType,
  MaterialTypeTagMap,
} from "@sentence-bank/types";

import { DRILL_TAGS, LEARNING_AREAS, MATERIAL_TYPES } from "@sentence-bank/types";

/** Sentinel for the "no website filter" option (mirrors `lib/answer-sheets.ts`'s `ALL_FILTER`). */
export const ALL_FILTER = "all";

export interface FilterOption {
  value: string;
  label: string;
}

/** The website filter's key for a resource (its site name, falling back to domain); "" when unknown. */
function websiteKey(r: BookmarkResource): string {
  return r.website?.siteName || r.website?.domain || "";
}

/** Tally a keyed count over resources, ignoring the empty key. */
function countBy(resources: BookmarkResource[], key: (r: BookmarkResource) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of resources) {
    const k = key(r);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Build the website filter options (with per-option resource counts), alphabetized, "All" first. */
export function websiteFilterOptions(resources: BookmarkResource[]): FilterOption[] {
  const counts = countBy(resources, websiteKey);
  return [
    {
      value: ALL_FILTER,
      label: `All websites (${resources.length})`,
    },
    ...[...counts.keys()].sort((a, b) => a.localeCompare(b)).map(name => ({
      value: name,
      label: `${name} (${counts.get(name) ?? 0})`,
    })),
  ];
}

/** True when a resource passes the website filter (`ALL_FILTER` passes everything). */
export function matchesWebsite(r: BookmarkResource, website: string): boolean {
  return website === ALL_FILTER || websiteKey(r) === website;
}

/** The media-type filter's key for a resource (its media type name); "" when unknown. */
function mediaTypeKey(r: BookmarkResource): string {
  return r.mediaType ?? "";
}

/** Build the media-type filter options (with per-option resource counts), alphabetized, "All" first. */
export function mediaTypeFilterOptions(resources: BookmarkResource[]): FilterOption[] {
  const counts = countBy(resources, mediaTypeKey);
  return [
    {
      value: ALL_FILTER,
      label: `All media types (${resources.length})`,
    },
    ...[...counts.keys()].sort((a, b) => a.localeCompare(b)).map(name => ({
      value: name,
      label: `${name} (${counts.get(name) ?? 0})`,
    })),
  ];
}

/** True when a resource passes the media-type filter (`ALL_FILTER` passes everything). */
export function matchesMediaType(r: BookmarkResource, mediaType: string): boolean {
  return mediaType === ALL_FILTER || mediaTypeKey(r) === mediaType;
}

/** A coarse media grouping for the resource-strip button filter: everything, videos, or books. */
export type ResourceMediaKind = "all" | "video" | "book";

/**
 * True when a resource matches a coarse media kind. `"all"` passes everything; `"video"`/`"book"`
 * match case-insensitively against the free-text media type (so "Video", "YouTube Video", "Book",
 * etc. all match), leaving anything else out.
 */
export function matchesMediaKind(r: BookmarkResource, kind: ResourceMediaKind): boolean {
  if (kind === "all") return true;
  return mediaTypeKey(r).toLowerCase().includes(kind);
}

/** True when a resource has a runtime — i.e. it's audio/video to listen to or shadow. */
export function hasRuntime(r: BookmarkResource): boolean {
  return r.runtimeSeconds != null;
}

/** The learning areas a resource carries: the mapped areas whose tag is on the resource. */
export function resourceLearningAreas(tagIds: string[], map: LearningAreaTagMap): LearningArea[] {
  return LEARNING_AREAS.filter((area) => {
    const tag = map[area];
    return tag ? tagIds.includes(tag.id) : false;
  });
}

/**
 * The learning areas that have a tag configured, as filter options with per-area resource counts
 * (empty when nothing is mapped).
 */
export function learningAreaFilterOptions(
  map: LearningAreaTagMap,
  resources: BookmarkResource[],
): FilterOption[] {
  return LEARNING_AREAS.filter(area => map[area]).map((area) => {
    const count = resources.filter(r => resourceLearningAreas(r.tagIds, map).includes(area)).length;
    return {
      value: area,
      label: `${area} (${count})`,
    };
  });
}

/** True when a resource matches the selected learning areas (empty selection passes; ANY match otherwise). */
export function matchesLearningAreas(
  r: BookmarkResource,
  selected: string[],
  map: LearningAreaTagMap,
): boolean {
  if (selected.length === 0) return true;
  const areas = resourceLearningAreas(r.tagIds, map);
  return selected.some(area => areas.includes(area as LearningArea));
}

/** The material types a resource carries: the mapped types whose tag is on the resource. */
export function resourceMaterialTypes(tagIds: string[], map: MaterialTypeTagMap): MaterialType[] {
  return MATERIAL_TYPES.filter((type) => {
    const tag = map[type];
    return tag ? tagIds.includes(tag.id) : false;
  });
}

/**
 * The material types that have a tag configured, as filter options with per-type resource counts
 * (empty when nothing is mapped).
 */
export function materialTypeFilterOptions(
  map: MaterialTypeTagMap,
  resources: BookmarkResource[],
): FilterOption[] {
  return MATERIAL_TYPES.filter(type => map[type]).map((type) => {
    const count = resources.filter(r => resourceMaterialTypes(r.tagIds, map).includes(type)).length;
    return {
      value: type,
      label: `${type} (${count})`,
    };
  });
}

/** True when a resource matches the selected material types (empty selection passes; ANY match otherwise). */
export function matchesMaterialTypes(
  r: BookmarkResource,
  selected: string[],
  map: MaterialTypeTagMap,
): boolean {
  if (selected.length === 0) return true;
  const types = resourceMaterialTypes(r.tagIds, map);
  return selected.some(type => types.includes(type as MaterialType));
}

/** The drill tags a resource carries: the mapped drill tags whose tag is on the resource. */
export function resourceDrillTags(tagIds: string[], map: DrillTagMap): DrillTag[] {
  return DRILL_TAGS.filter((tag) => {
    const mapped = map[tag];
    return mapped ? tagIds.includes(mapped.id) : false;
  });
}

/**
 * The drill tags that have a tag configured, as filter options with per-tag resource counts
 * (empty when nothing is mapped).
 */
export function drillTagFilterOptions(
  map: DrillTagMap,
  resources: BookmarkResource[],
): FilterOption[] {
  return DRILL_TAGS.filter(tag => map[tag]).map((tag) => {
    const count = resources.filter(r => resourceDrillTags(r.tagIds, map).includes(tag)).length;
    return {
      value: tag,
      label: `${tag} (${count})`,
    };
  });
}

/** True when a resource matches the selected drill tags (empty selection passes; ANY match otherwise). */
export function matchesDrillTags(
  r: BookmarkResource,
  selected: string[],
  map: DrillTagMap,
): boolean {
  if (selected.length === 0) return true;
  const tags = resourceDrillTags(r.tagIds, map);
  return selected.some(tag => tags.includes(tag as DrillTag));
}

/** One session-start action a Collections card can offer. */
export type ResourceAction = "listening" | "shadowing" | "reading" | "writing";

/**
 * The session actions each learning area offers on a Collections card; areas without one (Grammar/Vocab)
 * are absent. Listening material can also be shadowed (listen-and-repeat is speaking practice), so a
 * Listening resource offers both listening and shadowing.
 */
export const LEARNING_AREA_ACTIONS: Partial<Record<LearningArea, ResourceAction[]>> = {
  Listening: ["listening", "shadowing"],
  Speaking: ["shadowing"],
  Reading: ["reading"],
  Writing: ["writing"],
};

/**
 * The session-start buttons a resource card should offer, derived from its learning areas. Falls back to
 * the runtime heuristic (audio/video → listening+shadowing, else reading+writing) when the resource has
 * no area that maps to an action, so untagged resources still get sensible buttons.
 */
export function resourceActions(r: BookmarkResource, map: LearningAreaTagMap): ResourceAction[] {
  const fromAreas = resourceLearningAreas(r.tagIds, map).flatMap(area => LEARNING_AREA_ACTIONS[area] ?? []);
  if (fromAreas.length > 0) return [...new Set(fromAreas)];
  return hasRuntime(r) ? ["listening", "shadowing"] : ["reading", "writing"];
}

/** The complexity scale's lowest level (0-based). */
export const COMPLEXITY_MIN = 0;

/** The selectable complexity levels for a scale, e.g. `[{ value: 0, label: "Absolute Beginner" }, …]`. */
export function complexityLevelOptions(scale: ComplexityScale): { value: number;
  label: string; }[] {
  const out: { value: number;
    label: string; }[] = [];
  for (let level = COMPLEXITY_MIN; level <= scale.max; level++) {
    out.push({
      value: level,
      label: scale.labels[String(level)] ?? `Level ${level}`,
    });
  }
  return out;
}

/**
 * True when a resource passes the complexity window `[selMin, selMax]`. A full-width window (the whole
 * scale) passes everything, including resources with no complexity set; any narrower window excludes
 * unset resources and keeps those whose band overlaps the window.
 */
export function matchesComplexity(
  r: BookmarkResource,
  selMin: number,
  selMax: number,
  scale: ComplexityScale | null,
): boolean {
  if (!scale) return true;
  const active = selMin > COMPLEXITY_MIN || selMax < scale.max;
  if (!active) return true;
  if (!r.complexity) return false;
  return r.complexity.min <= selMax && r.complexity.max >= selMin;
}

/** A short label for a resource's complexity band, e.g. "Beginner" or "Beginner–Intermediate"; "" when unset. */
export function formatComplexity(r: BookmarkResource, scale: ComplexityScale | null): string {
  if (!r.complexity || !scale) return "";
  const label = (level: number) => scale.labels[String(level)] ?? `Level ${level}`;
  const lo = label(r.complexity.min);
  return r.complexity.min === r.complexity.max ? lo : `${lo}–${label(r.complexity.max)}`;
}

/** Sort by runtime; resources without a runtime always sort last regardless of direction. */
export function sortByRuntime(resources: BookmarkResource[], dir: "asc" | "desc"): BookmarkResource[] {
  return [...resources].sort((a, b) => {
    if (a.runtimeSeconds == null && b.runtimeSeconds == null) return 0;
    if (a.runtimeSeconds == null) return 1;
    if (b.runtimeSeconds == null) return -1;
    return dir === "asc" ? a.runtimeSeconds - b.runtimeSeconds : b.runtimeSeconds - a.runtimeSeconds;
  });
}

/** How the Collections list is sorted (favorited items always come first, then this key). */
export type ResourceSort = "runtime-desc" | "runtime-asc" | "progress-desc" | "progress-asc";

/**
 * Sort resources: favorited first, then by the chosen key (runtime seconds, or progress percent).
 * Resources missing the sorted value sort last within their favorite/non-favorite group.
 */
export function sortResources(resources: BookmarkResource[], sort: ResourceSort): BookmarkResource[] {
  const [key, dir] = sort.split("-") as ["runtime" | "progress", "asc" | "desc"];
  const value = (r: BookmarkResource): number | null =>
    key === "runtime" ? r.runtimeSeconds : (r.progress ? r.progress.percent : null);
  return [...resources].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    const av = value(a);
    const bv = value(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return dir === "asc" ? av - bv : bv - av;
  });
}

/** The four valid `ResourceSort` values, for validating a value from the URL. */
const RESOURCE_SORTS: ResourceSort[] = ["runtime-desc", "runtime-asc", "progress-desc", "progress-asc"];

/**
 * The URL-search shape backing the Collections page filters. Every field is optional; a missing field
 * means "default" (all/none), so default values are omitted from the URL to keep links clean. Keys are
 * kept short (`q`, `cmin`, `cmax`) for tidy URLs.
 */
export interface CollectionsSearch {
  q?: string;
  website?: string;
  mediaType?: string;
  areas?: LearningArea[];
  materials?: MaterialType[];
  drills?: DrillTag[];
  sort?: ResourceSort;
  cmin?: number;
  cmax?: number;
}

/** A non-empty trimmed string from an unknown value, or undefined. */
function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** A finite number from an unknown value (accepting numeric strings from the URL), or undefined. */
function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** The members of `value` (a value or array) that are in `allowed`, or undefined when none. */
function allowedMembers<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  const raw = Array.isArray(value) ? value : [value];
  const kept = raw.filter((v): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v));
  return kept.length > 0 ? [...new Set(kept)] : undefined;
}

/**
 * Parse and validate the Collections page's URL search params, dropping anything malformed and keeping
 * only recognized enum members. Used by the route's `validateSearch` so bookmarked/shared filter URLs
 * are safe and typed.
 */
export function parseCollectionsSearch(raw: Record<string, unknown>): CollectionsSearch {
  const sort = optionalString(raw.sort);
  return {
    q: optionalString(raw.q),
    website: optionalString(raw.website),
    mediaType: optionalString(raw.mediaType),
    areas: allowedMembers(raw.areas, LEARNING_AREAS),
    materials: allowedMembers(raw.materials, MATERIAL_TYPES),
    drills: allowedMembers(raw.drills, DRILL_TAGS),
    sort: sort && (RESOURCE_SORTS as string[]).includes(sort) ? (sort as ResourceSort) : undefined,
    cmin: optionalNumber(raw.cmin),
    cmax: optionalNumber(raw.cmax),
  };
}

/** Format a runtime in seconds as `H:MM:SS` (or `M:SS` under an hour); "—" when null. */
export function formatRuntime(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
