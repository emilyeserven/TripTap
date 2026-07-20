import type {
  BookmarkResource,
  ComplexityScale,
  DrillTagMap,
  LearningAreaTagMap,
  MaterialTypeTagMap,
} from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  ALL_FILTER,
  complexityLevelOptions,
  drillTagFilterOptions,
  formatComplexity,
  formatRuntime,
  hasRuntime,
  learningAreaFilterOptions,
  matchesComplexity,
  matchesDrillTags,
  matchesLearningAreas,
  matchesMaterialTypes,
  matchesMediaKind,
  matchesMediaType,
  materialTypeFilterOptions,
  mediaTypeFilterOptions,
  matchesWebsite,
  parseCollectionsSearch,
  resourceActions,
  resourceDrillTags,
  resourceLearningAreas,
  resourceMaterialTypes,
  sortByRuntime,
  sortResources,
  websiteFilterOptions,
} from "./collections";

function resource(over: Partial<BookmarkResource>): BookmarkResource {
  return {
    id: "x",
    title: "t",
    url: null,
    website: null,
    runtimeSeconds: null,
    mediaType: null,
    complexity: null,
    progress: null,
    favorite: false,
    tagIds: [],
    imageUrl: null,
    ...over,
  };
}

const SCALE: ComplexityScale = {
  max: 5,
  labels: {
    0: "Absolute Beginner",
    1: "Beginner",
    2: "Intermediate-Beginner",
    3: "Intermediate",
    4: "Advanced-Intermediate",
    5: "Advanced",
  },
};

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
  it("alphabetizes site names with counts and an All (total) option first", () => {
    expect(websiteFilterOptions([yt, nf, noRuntime])).toEqual([
      {
        value: ALL_FILTER,
        label: "All websites (3)",
      },
      {
        value: "Netflix",
        label: "Netflix (1)",
      },
      {
        value: "YouTube",
        label: "YouTube (2)",
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

describe("mediaTypeFilterOptions / matchesMediaType", () => {
  const video = resource({
    id: "a",
    mediaType: "Video",
  });
  const book = resource({
    id: "b",
    mediaType: "Book",
  });
  const none = resource({
    id: "c",
    mediaType: null,
  });

  it("alphabetizes media types with counts and an All (total) option first", () => {
    expect(mediaTypeFilterOptions([video, book, none, video])).toEqual([
      {
        value: ALL_FILTER,
        label: "All media types (4)",
      },
      {
        value: "Book",
        label: "Book (1)",
      },
      {
        value: "Video",
        label: "Video (2)",
      },
    ]);
  });

  it("passes everything for ALL_FILTER and matches by name otherwise", () => {
    expect(matchesMediaType(video, ALL_FILTER)).toBe(true);
    expect(matchesMediaType(video, "Video")).toBe(true);
    expect(matchesMediaType(book, "Video")).toBe(false);
  });
});

describe("matchesMediaKind", () => {
  const video = resource({
    id: "a",
    mediaType: "YouTube Video",
  });
  const book = resource({
    id: "b",
    mediaType: "Book",
  });
  const none = resource({
    id: "c",
    mediaType: null,
  });

  it("passes everything for 'all'", () => {
    expect(matchesMediaKind(video, "all")).toBe(true);
    expect(matchesMediaKind(book, "all")).toBe(true);
    expect(matchesMediaKind(none, "all")).toBe(true);
  });

  it("matches videos and books case-insensitively, excluding untyped resources", () => {
    expect(matchesMediaKind(video, "video")).toBe(true);
    expect(matchesMediaKind(book, "video")).toBe(false);
    expect(matchesMediaKind(none, "video")).toBe(false);
    expect(matchesMediaKind(book, "book")).toBe(true);
    expect(matchesMediaKind(video, "book")).toBe(false);
  });
});

describe("hasRuntime", () => {
  it("is true only when the resource has a runtime", () => {
    expect(hasRuntime(resource({
      runtimeSeconds: 10,
    }))).toBe(true);
    expect(hasRuntime(resource({
      runtimeSeconds: null,
    }))).toBe(false);
  });
});

describe("complexityLevelOptions", () => {
  it("lists every level 0..max with its label", () => {
    expect(complexityLevelOptions(SCALE)).toEqual([
      {
        value: 0,
        label: "Absolute Beginner",
      },
      {
        value: 1,
        label: "Beginner",
      },
      {
        value: 2,
        label: "Intermediate-Beginner",
      },
      {
        value: 3,
        label: "Intermediate",
      },
      {
        value: 4,
        label: "Advanced-Intermediate",
      },
      {
        value: 5,
        label: "Advanced",
      },
    ]);
  });

  it("falls back to a generic label when one is missing", () => {
    expect(complexityLevelOptions({
      max: 1,
      labels: {},
    })).toEqual([
      {
        value: 0,
        label: "Level 0",
      },
      {
        value: 1,
        label: "Level 1",
      },
    ]);
  });
});

describe("matchesComplexity", () => {
  const beginner = resource({
    complexity: {
      min: 1,
      max: 1,
    },
  });
  const spread = resource({
    complexity: {
      min: 2,
      max: 4,
    },
  });
  const unset = resource({
    complexity: null,
  });

  it("passes everything (incl. unset) when the window is the full scale", () => {
    expect(matchesComplexity(unset, 0, 5, SCALE)).toBe(true);
    expect(matchesComplexity(beginner, 0, 5, SCALE)).toBe(true);
  });

  it("excludes unset resources once the window is narrowed", () => {
    expect(matchesComplexity(unset, 1, 5, SCALE)).toBe(false);
  });

  it("keeps resources whose band overlaps the window", () => {
    expect(matchesComplexity(beginner, 1, 2, SCALE)).toBe(true);
    expect(matchesComplexity(beginner, 3, 5, SCALE)).toBe(false);
    expect(matchesComplexity(spread, 4, 5, SCALE)).toBe(true); // 2..4 overlaps 4..5
    expect(matchesComplexity(spread, 0, 1, SCALE)).toBe(false); // 2..4 vs 0..1
  });

  it("passes everything when there is no scale", () => {
    expect(matchesComplexity(unset, 2, 3, null)).toBe(true);
  });
});

describe("formatComplexity", () => {
  it("labels a single level and a range, and is empty when unset", () => {
    expect(formatComplexity(resource({
      complexity: {
        min: 1,
        max: 1,
      },
    }), SCALE)).toBe("Beginner");
    expect(formatComplexity(resource({
      complexity: {
        min: 1,
        max: 3,
      },
    }), SCALE)).toBe("Beginner–Intermediate");
    expect(formatComplexity(resource({
      complexity: null,
    }), SCALE)).toBe("");
  });
});

const AREA_MAP: LearningAreaTagMap = {
  Listening: {
    id: "tL",
    name: "Listening",
  },
  Speaking: {
    id: "tS",
    name: "Speaking",
  },
  Reading: {
    id: "tR",
    name: "Reading",
  },
  Writing: {
    id: "tW",
    name: "Writing",
  },
};

describe("resourceLearningAreas", () => {
  it("returns the mapped areas whose tag is on the resource, in canonical order", () => {
    expect(resourceLearningAreas(["tR", "tL"], AREA_MAP)).toEqual(["Listening", "Reading"]);
    expect(resourceLearningAreas(["nope"], AREA_MAP)).toEqual([]);
    expect(resourceLearningAreas(["tL"], {})).toEqual([]);
  });
});

describe("learningAreaFilterOptions", () => {
  it("lists only mapped areas as options, each with a resource count", () => {
    const map = {
      Listening: {
        id: "tL",
        name: "L",
      },
      Reading: {
        id: "tR",
        name: "R",
      },
    };
    const resources = [
      resource({
        tagIds: ["tL"],
      }),
      resource({
        tagIds: ["tL", "tR"],
      }),
    ];
    expect(learningAreaFilterOptions(map, resources)).toEqual([
      {
        value: "Listening",
        label: "Listening (2)",
      },
      {
        value: "Reading",
        label: "Reading (1)",
      },
    ]);
  });
});

describe("matchesLearningAreas", () => {
  it("passes everything when nothing is selected, else matches ANY selected area", () => {
    const r = resource({
      tagIds: ["tL"],
    });
    expect(matchesLearningAreas(r, [], AREA_MAP)).toBe(true);
    expect(matchesLearningAreas(r, ["Listening"], AREA_MAP)).toBe(true);
    expect(matchesLearningAreas(r, ["Reading", "Listening"], AREA_MAP)).toBe(true);
    expect(matchesLearningAreas(r, ["Reading"], AREA_MAP)).toBe(false);
  });
});

const MATERIAL_MAP: MaterialTypeTagMap = {
  Graded: {
    id: "tG",
    name: "Graded",
  },
  Native: {
    id: "tN",
    name: "Native",
  },
};

describe("resourceMaterialTypes", () => {
  it("returns the mapped types whose tag is on the resource, in canonical order", () => {
    expect(resourceMaterialTypes(["tN", "tG"], MATERIAL_MAP)).toEqual(["Graded", "Native"]);
    expect(resourceMaterialTypes(["nope"], MATERIAL_MAP)).toEqual([]);
    expect(resourceMaterialTypes(["tG"], {})).toEqual([]);
  });
});

describe("materialTypeFilterOptions", () => {
  it("lists only mapped types as options, each with a resource count", () => {
    const resources = [
      resource({
        tagIds: ["tG"],
      }),
      resource({
        tagIds: ["tG", "tN"],
      }),
    ];
    expect(materialTypeFilterOptions(MATERIAL_MAP, resources)).toEqual([
      {
        value: "Graded",
        label: "Graded (2)",
      },
      {
        value: "Native",
        label: "Native (1)",
      },
    ]);
  });

  it("omits types that are not mapped", () => {
    expect(materialTypeFilterOptions({
      Native: {
        id: "tN",
        name: "Native",
      },
    }, [])).toEqual([
      {
        value: "Native",
        label: "Native (0)",
      },
    ]);
  });
});

describe("matchesMaterialTypes", () => {
  it("passes everything when nothing is selected, else matches ANY selected type", () => {
    const r = resource({
      tagIds: ["tG"],
    });
    expect(matchesMaterialTypes(r, [], MATERIAL_MAP)).toBe(true);
    expect(matchesMaterialTypes(r, ["Graded"], MATERIAL_MAP)).toBe(true);
    expect(matchesMaterialTypes(r, ["Native", "Graded"], MATERIAL_MAP)).toBe(true);
    expect(matchesMaterialTypes(r, ["Native"], MATERIAL_MAP)).toBe(false);
  });
});

const DRILL_MAP: DrillTagMap = {
  Drills: {
    id: "tD",
    name: "Drills",
  },
};

describe("resourceDrillTags", () => {
  it("returns Drills only when the mapped tag is on the resource", () => {
    expect(resourceDrillTags(["tD"], DRILL_MAP)).toEqual(["Drills"]);
    expect(resourceDrillTags(["nope"], DRILL_MAP)).toEqual([]);
    expect(resourceDrillTags(["tD"], {})).toEqual([]);
  });
});

describe("drillTagFilterOptions", () => {
  it("lists the mapped Drills tag with a resource count, or nothing when unmapped", () => {
    const resources = [
      resource({
        tagIds: ["tD"],
      }),
      resource({
        tagIds: [],
      }),
    ];
    expect(drillTagFilterOptions(DRILL_MAP, resources)).toEqual([
      {
        value: "Drills",
        label: "Drills (1)",
      },
    ]);
    expect(drillTagFilterOptions({}, resources)).toEqual([]);
  });
});

describe("matchesDrillTags", () => {
  it("passes everything when nothing is selected, else matches the Drills tag", () => {
    const r = resource({
      tagIds: ["tD"],
    });
    expect(matchesDrillTags(r, [], DRILL_MAP)).toBe(true);
    expect(matchesDrillTags(r, ["Drills"], DRILL_MAP)).toBe(true);
    expect(matchesDrillTags(resource({
      tagIds: [],
    }), ["Drills"], DRILL_MAP)).toBe(false);
  });
});

describe("resourceActions", () => {
  it("derives session buttons from the resource's learning areas (Listening also offers shadowing)", () => {
    expect(resourceActions(resource({
      tagIds: ["tL", "tW"],
    }), AREA_MAP)).toEqual(["listening", "shadowing", "writing"]);
    expect(resourceActions(resource({
      tagIds: ["tS"],
    }), AREA_MAP)).toEqual(["shadowing"]);
  });

  it("falls back to the runtime heuristic when no area maps to an action", () => {
    expect(resourceActions(resource({
      tagIds: [],
      runtimeSeconds: 120,
    }), AREA_MAP)).toEqual(["listening", "shadowing"]);
    expect(resourceActions(resource({
      tagIds: [],
      runtimeSeconds: null,
    }), AREA_MAP)).toEqual(["reading", "writing"]);
  });
});

describe("sortResources", () => {
  const fav = resource({
    id: "fav",
    favorite: true,
    runtimeSeconds: 10,
  });
  const long = resource({
    id: "long",
    runtimeSeconds: 300,
  });
  const short = resource({
    id: "short",
    runtimeSeconds: 60,
  });
  const noRt = resource({
    id: "noRt",
    runtimeSeconds: null,
  });

  it("always lists favorites first, then applies the key", () => {
    expect(sortResources([long, fav, short], "runtime-desc").map(r => r.id)).toEqual(["fav", "long", "short"]);
  });

  it("sorts by runtime with nulls last within each favorite group", () => {
    expect(sortResources([noRt, long, short], "runtime-asc").map(r => r.id)).toEqual(["short", "long", "noRt"]);
  });

  it("sorts by progress percent", () => {
    const p20 = resource({
      id: "p20",
      progress: {
        current: 1,
        total: 5,
        percent: 0.2,
        label: "1 of 5",
      },
    });
    const p80 = resource({
      id: "p80",
      progress: {
        current: 4,
        total: 5,
        percent: 0.8,
        label: "4 of 5",
      },
    });
    const pNone = resource({
      id: "pNone",
      progress: null,
    });
    expect(sortResources([p20, pNone, p80], "progress-desc").map(r => r.id)).toEqual(["p80", "p20", "pNone"]);
  });
});

describe("parseCollectionsSearch", () => {
  it("returns all-undefined for an empty search", () => {
    expect(parseCollectionsSearch({})).toEqual({
      q: undefined,
      website: undefined,
      mediaType: undefined,
      areas: undefined,
      materials: undefined,
      drills: undefined,
      sort: undefined,
      cmin: undefined,
      cmax: undefined,
    });
  });

  it("keeps recognized string, enum, and numeric fields", () => {
    expect(parseCollectionsSearch({
      q: "cats",
      website: "YouTube",
      mediaType: "Book",
      areas: ["Reading", "Writing"],
      materials: ["Graded"],
      drills: ["Drills"],
      sort: "progress-asc",
      cmin: 1,
      cmax: 4,
    })).toEqual({
      q: "cats",
      website: "YouTube",
      mediaType: "Book",
      areas: ["Reading", "Writing"],
      materials: ["Graded"],
      drills: ["Drills"],
      sort: "progress-asc",
      cmin: 1,
      cmax: 4,
    });
  });

  it("drops unrecognized enum members and invalid sort values", () => {
    const parsed = parseCollectionsSearch({
      areas: ["Reading", "Bogus"],
      materials: ["Nope"],
      sort: "sideways",
    });
    expect(parsed.areas).toEqual(["Reading"]);
    expect(parsed.materials).toBeUndefined();
    expect(parsed.sort).toBeUndefined();
  });

  it("coerces numeric strings and rejects non-numeric ones for the complexity bounds", () => {
    expect(parseCollectionsSearch({
      cmin: "2",
      cmax: "x",
    })).toMatchObject({
      cmin: 2,
      cmax: undefined,
    });
  });

  it("accepts a single enum value as well as an array, and de-dupes", () => {
    expect(parseCollectionsSearch({
      areas: "Reading",
    }).areas).toEqual(["Reading"]);
    expect(parseCollectionsSearch({
      areas: ["Reading", "Reading"],
    }).areas).toEqual(["Reading"]);
  });

  it("treats blank/whitespace strings as absent", () => {
    expect(parseCollectionsSearch({
      q: "   ",
      website: "",
    })).toMatchObject({
      q: undefined,
      website: undefined,
    });
  });
});
