import assert from "node:assert/strict";
import { describe, it, test } from "node:test";

import { buildApp } from "@/app";
import { parseCandidates, toInk } from "@/services/handwriting";

/** A minimal two-stroke drawing, in the shape the route accepts. */
const strokes = [
  {
    x: [10, 20, 30],
    y: [10, 10, 10],
  },
  {
    x: [20, 20],
    y: [5, 40],
  },
];

test("POST /api/handwriting/recognize requires a body", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/handwriting/recognize",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/handwriting/recognize rejects an empty stroke list", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/handwriting/recognize",
    payload: {
      width: 300,
      height: 224,
      strokes: [],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/handwriting/recognize rejects a stroke missing its y coordinates", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/handwriting/recognize",
    payload: {
      width: 300,
      height: 224,
      strokes: [
        {
          x: [10, 20],
        },
      ],
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/handwriting/recognize rejects a drawing over the stroke cap", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/handwriting/recognize",
    payload: {
      width: 300,
      height: 224,
      strokes: Array.from({
        length: 65,
      }, () => ({
        x: [1, 2],
        y: [1, 2],
      })),
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/handwriting/recognize returns 502 when the recognizer is unreachable", async () => {
  // Point the resolver at a closed port so fetch fails fast → HandwritingUnavailableError → 502.
  const prev = process.env.HANDWRITING_API_URL;
  process.env.HANDWRITING_API_URL = "http://127.0.0.1:1";
  try {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/handwriting/recognize",
      payload: {
        width: 300,
        height: 224,
        strokes,
      },
    });
    assert.equal(res.statusCode, 502);
    await app.close();
  }
  finally {
    if (prev === undefined) delete process.env.HANDWRITING_API_URL;
    else process.env.HANDWRITING_API_URL = prev;
  }
});

describe("toInk", () => {
  it("maps each stroke to parallel x / y / time arrays", () => {
    assert.deepEqual(toInk(strokes), [
      [[10, 20, 30], [10, 10, 10], [0, 0, 0]],
      [[20, 20], [5, 40], [0, 0]],
    ]);
  });

  it("drops empty strokes and strokes whose coordinate arrays disagree", () => {
    const ink = toInk([
      {
        x: [],
        y: [],
      },
      {
        x: [1, 2],
        y: [1],
      },
      {
        x: [3],
        y: [4],
      },
    ]);
    assert.deepEqual(ink, [[[3], [4], [0]]]);
  });
});

describe("parseCandidates", () => {
  it("pulls the ranked characters out of a successful response", () => {
    const body = ["SUCCESS", [["0", ["日", "目", "曰"], [], {
      is_html_escaped: false,
    }]]];
    assert.deepEqual(parseCandidates(body, 8), ["日", "目", "曰"]);
  });

  it("caps the list at the requested limit", () => {
    const body = ["SUCCESS", [["0", ["日", "目", "曰", "白"]]]];
    assert.deepEqual(parseCandidates(body, 2), ["日", "目"]);
  });

  it("returns nothing for a failure status", () => {
    assert.deepEqual(parseCandidates(["FAILED_TO_UNDERSTAND", []], 8), []);
  });

  it("returns nothing for truncated or malformed shapes", () => {
    assert.deepEqual(parseCandidates(["SUCCESS"], 8), []);
    assert.deepEqual(parseCandidates(["SUCCESS", []], 8), []);
    assert.deepEqual(parseCandidates(["SUCCESS", [["0"]]], 8), []);
    assert.deepEqual(parseCandidates(null, 8), []);
    assert.deepEqual(parseCandidates({
      candidates: ["日"],
    }, 8), []);
  });

  it("skips non-string and empty entries", () => {
    const body = ["SUCCESS", [["0", ["日", 42, "", null, "目"]]]];
    assert.deepEqual(parseCandidates(body, 8), ["日", "目"]);
  });
});
