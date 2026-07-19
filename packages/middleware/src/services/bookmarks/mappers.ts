import type {
  BookmarkRecord,
  BookmarkResource,
  BookmarkSection,
  BookmarkSectionNode,
  BookmarkSectionRef,
  BookmarkSectionType,
  BookmarksTaxonomy,
  TagTermOption,
} from "@sentence-bank/types";

import { BookmarksUnavailableError } from "@/services/bookmarks/errors";

/**
 * Pure mappers from the upstream bookmarks host's loose JSON shapes to the wire types we surface.
 * Everything here is synchronous and side-effect free; the fetch orchestration lives in `index.ts`.
 */

/**
 * The bookmark's display title. Prefers the primary localized name (`names[]` with `isPrimary`, else the
 * first name) — that's what renaming a bookmark in the host updates. The top-level `title` field is an
 * auto-grabbed value that can lag behind a rename, so it's only the fallback when a bookmark has no names.
 */
function pickTitle(o: Record<string, unknown>): string | null {
  if (Array.isArray(o.names)) {
    const names = o.names.filter((n): n is Record<string, unknown> => Boolean(n) && typeof n === "object");
    const named = names.find(n => n.isPrimary && typeof n.value === "string" && n.value !== "")
      ?? names.find(n => typeof n.value === "string" && n.value !== "");
    if (named && typeof named.value === "string") return named.value;
  }
  return typeof o.title === "string" ? o.title : null;
}

/** Pull the fields we depend on from an upstream tag/term object, ignoring the rest. */
export function toOption(raw: unknown): TagTermOption | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  return {
    id: o.id,
    name: o.name,
    parentId: typeof o.parentId === "string" ? o.parentId : null,
    slug: typeof o.slug === "string" ? o.slug : null,
    description: typeof o.description === "string" ? o.description : null,
  };
}

export function toOptions(raw: unknown): TagTermOption[] {
  return Array.isArray(raw) ? raw.map(toOption).filter((o): o is TagTermOption => o !== null) : [];
}

/** Pull the fields we depend on from an upstream taxonomy object. */
export function toTaxonomy(raw: unknown): BookmarksTaxonomy | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  return {
    id: o.id,
    name: o.name,
    slug: typeof o.slug === "string" ? o.slug : "",
    hierarchical: Boolean(o.hierarchical),
    singleValue: Boolean(o.singleValue),
    icon: typeof o.icon === "string" ? o.icon : null,
    termCount: typeof o.termCount === "number" ? o.termCount : 0,
  };
}

/**
 * Recursively flatten a bookmark's `sectionsValues[].sections[]` tree into the timestamp sections we
 * surface. Only entries with `type === "timestamp"` and both a start and end value are kept.
 */
export function flattenTimestampSections(raw: unknown): BookmarkSection[] {
  const out: BookmarkSection[] = [];
  const walk = (sections: unknown): void => {
    if (!Array.isArray(sections)) return;
    for (const s of sections) {
      if (!s || typeof s !== "object") continue;
      const o = s as Record<string, unknown>;
      if (
        o.type === "timestamp"
        && typeof o.startValue === "string"
        && o.startValue !== ""
        && typeof o.endValue === "string"
        && o.endValue !== ""
      ) {
        out.push({
          id: typeof o.id === "string" ? o.id : `${out.length}`,
          label: typeof o.name === "string" ? o.name : null,
          startValue: o.startValue,
          endValue: o.endValue,
        });
      }
      if (Array.isArray(o.children)) walk(o.children);
    }
  };
  if (Array.isArray(raw)) {
    for (const group of raw) {
      if (group && typeof group === "object") walk((group as Record<string, unknown>).sections);
    }
  }
  return out;
}

const SECTION_TYPES = new Set<BookmarkSectionType>(["name", "url", "page", "timestamp"]);

/** A non-empty upstream string value, else null. */
function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/**
 * Flatten a bookmark's `sectionsValues[].sections[]` tree into an adjacency list ({@link BookmarkSectionNode}[]),
 * preserving the hierarchy via `parentId` and keeping **every** entry type (name/url/page/timestamp) — unlike
 * {@link flattenTimestampSections}, which keeps only timestamps. Entries without a string `id` are skipped
 * (their id is what a reference stores). Feeds the chained-combobox section picker on the client.
 */
export function toSectionNodes(raw: unknown): BookmarkSectionNode[] {
  const out: BookmarkSectionNode[] = [];
  const walk = (sections: unknown, parentId: string | null): void => {
    if (!Array.isArray(sections)) return;
    for (const s of sections) {
      if (!s || typeof s !== "object") continue;
      const o = s as Record<string, unknown>;
      if (typeof o.id !== "string") continue;
      const type: BookmarkSectionType = SECTION_TYPES.has(o.type as BookmarkSectionType)
        ? (o.type as BookmarkSectionType)
        : "name";
      out.push({
        id: o.id,
        name: typeof o.name === "string" ? o.name : "",
        parentId,
        type,
        startValue: strOrNull(o.startValue),
        endValue: strOrNull(o.endValue),
        url: strOrNull(o.url),
        tagIds: Array.isArray(o.tagIds) ? o.tagIds.filter((t): t is string => typeof t === "string") : [],
      });
      if (Array.isArray(o.children)) walk(o.children, o.id);
    }
  };
  if (Array.isArray(raw)) {
    for (const group of raw) {
      if (group && typeof group === "object") walk((group as Record<string, unknown>).sections, null);
    }
  }
  return out;
}

/** Display label for a section node: its name, else a type-appropriate fallback (mirrors the client). */
function sectionNodeLabel(n: BookmarkSectionNode): string {
  if (n.name) return n.name;
  if (n.type === "timestamp" && n.startValue) return n.startValue;
  if (n.type === "page" && n.startValue) return `p. ${n.startValue}`;
  return n.type;
}

/**
 * The sections of one upstream bookmark whose `tagIds` include `tagId`, each as a {@link BookmarkSectionRef}
 * with a breadcrumb `label` built from its ancestor path. Backs the grammar note's "sections tagged with
 * this grammar point" gather.
 */
export function matchSectionsByTag(raw: unknown, tagId: string): BookmarkSectionRef[] {
  const nodes = toSectionNodes(raw);
  const byId = new Map(nodes.map(n => [n.id, n]));
  const breadcrumb = (node: BookmarkSectionNode): string => {
    const parts: string[] = [];
    const seen = new Set<string>();
    let cur: BookmarkSectionNode | undefined = node;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      parts.unshift(sectionNodeLabel(cur));
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.join(" › ");
  };
  return nodes
    .filter(n => n.tagIds.includes(tagId))
    .map(n => ({
      id: n.id,
      label: breadcrumb(n),
      type: n.type,
      startValue: n.startValue,
      endValue: n.endValue,
      name: n.name,
      parentId: n.parentId,
    }));
}

/** Pull the fields we depend on from an upstream bookmark record, optionally flattening its sections. */
export function toBookmarkRecord(raw: unknown, includeSections: boolean): BookmarkRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = pickTitle(o);
  if (typeof o.id !== "string" || title === null) return null;
  return {
    id: o.id,
    title,
    url: typeof o.url === "string" ? o.url : null,
    sections: includeSections ? flattenTimestampSections(o.sectionsValues) : [],
    sectionTree: includeSections ? toSectionNodes(o.sectionsValues) : [],
  };
}

/** True when a value is a non-null object — i.e. a readable upstream bookmark/record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

/** Dedupe bookmark records by id (first occurrence wins) and sort by title. */
export function dedupeBookmarksByTitle(records: BookmarkRecord[]): BookmarkRecord[] {
  const byId = new Map<string, BookmarkRecord>();
  for (const record of records) {
    if (!byId.has(record.id)) byId.set(record.id, record);
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** The resolved upstream custom-property ids the resource mapper reads out of `numberValues`. */
export interface ResourcePropertyIds {
  runtimePropId: string | null;
  complexityPropId: string | null;
}

/** Find the `numberValues` entry for a given property id, or null. */
function findNumberValue(
  numberValues: unknown,
  propertyId: string | null,
): Record<string, unknown> | null {
  if (!propertyId || !Array.isArray(numberValues)) return null;
  for (const nv of numberValues) {
    if (nv && typeof nv === "object") {
      const n = nv as Record<string, unknown>;
      if (n.propertyId === propertyId) return n;
    }
  }
  return null;
}

/**
 * Widen one upstream bookmark into a {@link BookmarkResource} for the Collections browser: pull its
 * `website`, its runtime and complexity (each a `numberValues` entry for the resolved property, complexity
 * normalized to a `{ min, max }` band), and its media-type name. Pure — the property ids are resolved once
 * by the caller. Null when unreadable.
 */
export function toBookmarkResource(raw: unknown, propIds: ResourcePropertyIds): BookmarkResource | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = pickTitle(o);
  if (typeof o.id !== "string" || title === null) return null;

  let website: BookmarkResource["website"] = null;
  if (o.website && typeof o.website === "object") {
    const w = o.website as Record<string, unknown>;
    const domain = typeof w.domain === "string" ? w.domain : null;
    const siteName = typeof w.siteName === "string" ? w.siteName : null;
    if (domain || siteName) {
      website = {
        domain: domain ?? siteName ?? "",
        siteName: siteName ?? domain ?? "",
      };
    }
  }

  const runtimeVal = findNumberValue(o.numberValues, propIds.runtimePropId);
  const runtimeSeconds = runtimeVal && typeof runtimeVal.value === "number" ? runtimeVal.value : null;

  // Complexity is a rating property, optionally range-valued (`value`..`valueEnd`). Normalize to a band.
  let complexity: BookmarkResource["complexity"] = null;
  const complexityVal = findNumberValue(o.numberValues, propIds.complexityPropId);
  if (complexityVal && typeof complexityVal.value === "number") {
    const start = complexityVal.value;
    const end = typeof complexityVal.valueEnd === "number" ? complexityVal.valueEnd : start;
    complexity = {
      min: Math.min(start, end),
      max: Math.max(start, end),
    };
  }

  let mediaType: string | null = null;
  if (o.mediaType && typeof o.mediaType === "object") {
    const m = o.mediaType as Record<string, unknown>;
    if (typeof m.name === "string") mediaType = m.name;
  }

  // Resolve the display image the way the bookmarks app does (`resolveBookmarkDisplayImage`): honor the
  // `imageDisplayPreference`, falling back to the other source when the preferred one is missing. So a
  // bookmark with only a screenshot (no uploaded/grabbed image) still shows a thumbnail. Both the image
  // and screenshot `url` are relative host paths (`/api/bookmarks/{id}/images/{imageId}` and
  // `/api/bookmarks/{id}/screenshot`), passed through verbatim to hit our matching same-origin proxies.
  const imageUrl = resolveDisplayImageUrl(o);

  const tagIds = Array.isArray(o.tags)
    ? o.tags
      .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === "object")
      .map(t => t.id)
      .filter((id): id is string => typeof id === "string")
    : [];

  return {
    id: o.id,
    title,
    url: typeof o.url === "string" ? o.url : null,
    website,
    runtimeSeconds,
    mediaType,
    complexity,
    tagIds,
    imageUrl,
  };
}

/** The non-empty `url` of an upstream image-like object (`{ url }`), or null. */
function imageObjectUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const url = (raw as Record<string, unknown>).url;
  return typeof url === "string" && url !== "" ? url : null;
}

/**
 * Which image URL a bookmark's cover shows, mirroring the bookmarks app's `resolveBookmarkDisplayImage`:
 * `imageDisplayPreference === "screenshot"` prefers the screenshot then the image; every other value
 * (`"image"`, `"auto"`, unset) prefers the image then the screenshot. Null when it has neither.
 */
export function resolveDisplayImageUrl(o: Record<string, unknown>): string | null {
  const image = imageObjectUrl(o.image);
  const screenshot = imageObjectUrl(o.screenshot);
  return o.imageDisplayPreference === "screenshot"
    ? (screenshot ?? image)
    : (image ?? screenshot);
}

/** Normalize an upstream create response into a {@link TagTermOption}, or fail if it can't be read. */
export function createdOption(raw: unknown): TagTermOption {
  const option = toOption(raw);
  if (!option) {
    throw new BookmarksUnavailableError("Bookmarks host returned an unexpected create response");
  }
  return option;
}
