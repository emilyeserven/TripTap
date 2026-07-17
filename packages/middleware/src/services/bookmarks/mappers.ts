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
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  return {
    id: o.id,
    title: o.title,
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

/**
 * Widen one upstream bookmark into a {@link BookmarkResource} for the "Find a Resource" browser: pull its
 * `website`, its runtime (the `numberValues` entry for the resolved "Runtime" property, in seconds), and
 * its media-type name. Pure — the runtime property id is resolved once by the caller. Null when unreadable.
 */
export function toBookmarkResource(raw: unknown, runtimePropId: string | null): BookmarkResource | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;

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

  let runtimeSeconds: number | null = null;
  if (runtimePropId && Array.isArray(o.numberValues)) {
    for (const nv of o.numberValues) {
      if (nv && typeof nv === "object") {
        const n = nv as Record<string, unknown>;
        if (n.propertyId === runtimePropId && typeof n.value === "number") {
          runtimeSeconds = n.value;
          break;
        }
      }
    }
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
    title: o.title,
    url: typeof o.url === "string" ? o.url : null,
    website,
    runtimeSeconds,
    mediaType,
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
