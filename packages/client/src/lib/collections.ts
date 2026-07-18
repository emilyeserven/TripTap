import type { BookmarkResource, ComplexityScale } from "@sentence-bank/types";

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

/** Build the website filter options from the resources, deduped and alphabetized, with an "All" first. */
export function websiteFilterOptions(resources: BookmarkResource[]): FilterOption[] {
  const names = new Set<string>();
  for (const r of resources) {
    const key = websiteKey(r);
    if (key) names.add(key);
  }
  return [
    {
      value: ALL_FILTER,
      label: "All websites",
    },
    ...[...names].sort((a, b) => a.localeCompare(b)).map(name => ({
      value: name,
      label: name,
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

/** Build the media-type filter options from the resources present, deduped and alphabetized, "All" first. */
export function mediaTypeFilterOptions(resources: BookmarkResource[]): FilterOption[] {
  const names = new Set<string>();
  for (const r of resources) {
    const key = mediaTypeKey(r);
    if (key) names.add(key);
  }
  return [
    {
      value: ALL_FILTER,
      label: "All media types",
    },
    ...[...names].sort((a, b) => a.localeCompare(b)).map(name => ({
      value: name,
      label: name,
    })),
  ];
}

/** True when a resource passes the media-type filter (`ALL_FILTER` passes everything). */
export function matchesMediaType(r: BookmarkResource, mediaType: string): boolean {
  return mediaType === ALL_FILTER || mediaTypeKey(r) === mediaType;
}

/** True when a resource has a runtime — i.e. it's audio/video to listen to or shadow. */
export function hasRuntime(r: BookmarkResource): boolean {
  return r.runtimeSeconds != null;
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
