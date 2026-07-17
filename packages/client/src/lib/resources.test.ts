import type { BookmarkResource } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  ALL_FILTER,
  formatRuntime,
  matchesWebsite,
  sortByRuntime,
  websiteFilterOptions,
} from "./resources";

function resource(over: Partial<BookmarkResource>): BookmarkResource {
  return {
    id: "x",
    title: "t",
    url: null,
    website: null,
    runtimeSeconds: null,
    mediaType: null,
    imageUrl: null,
    ...over,
  };
}

const yt = resource({
  id: "a",
  website: {
    domain: "youtube.com",
    siteName: "YouTube",
  },
  runtimeSeconds: 100,
});
const nf = resource({
  id: "b",
  website: {
    domain: "netflix.com",
    siteName: "Netflix",
  },
  runtimeSeconds: 50,
});
const noRuntime = resource({
  id: "c",
  website: {
    domain: "youtube.com",
    siteName: "YouTube",
  },
  runtimeSeconds: null,
});

describe("websiteFilterOptions", () => {
  it("dedupes and alphabetizes site names with an All option first", () => {
    expect(websiteFilterOptions([yt, nf, noRuntime])).toEqual([
      {
        value: ALL_FILTER,
        label: "All websites",
      },
      {
        value: "Netflix",
        label: "Netflix",
      },
      {
        value: "YouTube",
        label: "YouTube",
      },
    ]);
  });
});

describe("matchesWebsite", () => {
  it("passes everything for ALL_FILTER and matches by site name otherwise", () => {
    expect(matchesWebsite(yt, ALL_FILTER)).toBe(true);
    expect(matchesWebsite(yt, "YouTube")).toBe(true);
    expect(matchesWebsite(yt, "Netflix")).toBe(false);
  });
});

describe("sortByRuntime", () => {
  it("sorts ascending/descending with null runtimes always last", () => {
    expect(sortByRuntime([yt, nf, noRuntime], "asc").map(r => r.id)).toEqual(["b", "a", "c"]);
    expect(sortByRuntime([yt, nf, noRuntime], "desc").map(r => r.id)).toEqual(["a", "b", "c"]);
  });
});

describe("formatRuntime", () => {
  it("formats seconds as M:SS or H:MM:SS, and null as a dash", () => {
    expect(formatRuntime(50)).toBe("0:50");
    expect(formatRuntime(1652)).toBe("27:32");
    expect(formatRuntime(3661)).toBe("1:01:01");
    expect(formatRuntime(null)).toBe("—");
  });
});
