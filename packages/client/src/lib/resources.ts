import type { BookmarkResource } from "@sentence-bank/types";

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
