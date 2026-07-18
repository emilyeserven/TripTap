import type {
  BookmarkRecord,
  BookmarkResource,
  BookmarkSection,
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

  // The upstream `image.url` is a relative `/api/bookmarks/{id}/images/{imageId}` path; passed through
  // verbatim it hits our own bookmarks-image proxy (same namespace), which forwards it to the host.
  let imageUrl: string | null = null;
  if (o.image && typeof o.image === "object") {
    const img = o.image as Record<string, unknown>;
    if (typeof img.url === "string" && img.url !== "") imageUrl = img.url;
  }

  return {
    id: o.id,
    title,
    url: typeof o.url === "string" ? o.url : null,
    website,
    runtimeSeconds,
    mediaType,
    complexity,
    imageUrl,
  };
}

/** Normalize an upstream create response into a {@link TagTermOption}, or fail if it can't be read. */
export function createdOption(raw: unknown): TagTermOption {
  const option = toOption(raw);
  if (!option) {
    throw new BookmarksUnavailableError("Bookmarks host returned an unexpected create response");
  }
  return option;
}
