import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { OcrNotConfiguredError, OcrUnavailableError, runOcr } from "@/services/ocr";

// Unit tests for the multi-provider OCR orchestrator (selection order + automatic fallback).
// `fetch` is mocked so no real self-hosted/cloud backend is contacted.

const OCR_ENV = [
  "OCR_SERVICE_URL",
  "OCR_SPACE_API_KEY",
  "OCR_SPACE_ENGINE",
  "OCR_SPACE_LANGUAGE",
  "OCR_SPACE_URL",
  "GOOGLE_VISION_API_KEY",
  "GOOGLE_VISION_URL",
  "OCR_PROVIDERS",
];

function clearOcrEnv(): void {
  for (const key of OCR_ENV) delete process.env[key];
}

/** Minimal `Response`-like stand-in for a mocked `fetch`. */
function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

const IMG = Buffer.from([0x89, 0x50, 0x4E, 0x47]);

beforeEach(() => clearOcrEnv());
afterEach(() => {
  clearOcrEnv();
  mock.restoreAll();
});

test("runOcr throws OcrNotConfiguredError when no backend is configured", async () => {
  await assert.rejects(() => runOcr(IMG, "a.png", "image/png"), OcrNotConfiguredError);
});

test("runOcr uses the self-hosted service first and returns its result verbatim", async () => {
  process.env.OCR_SERVICE_URL = "http://ocr.local";
  process.env.OCR_SPACE_API_KEY = "key"; // configured but should not be reached
  const selfHostedResult = {
    blocks: [{
      text: "本",
      bbox: [],
      confidence: 0.9,
      lang: "ja",
      engine: "paddleocr",
    }],
    fullText: "本",
  };
  const fetchMock = mock.method(globalThis, "fetch", async (url: string) => {
    assert.match(url, /ocr\.local\/ocr$/);
    return jsonResponse(selfHostedResult);
  });

  const result = await runOcr(IMG, "a.png", "image/png");
  assert.deepEqual(result, selfHostedResult);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("runOcr falls back to OCR.space when the self-hosted service errors", async () => {
  process.env.OCR_SERVICE_URL = "http://ocr.local";
  process.env.OCR_SPACE_API_KEY = "key";
  const ocrSpaceBody = {
    IsErroredOnProcessing: false,
    ParsedResults: [{
      ParsedText: "毎朝\r\nコーヒー",
      TextOverlay: {
        Lines: [
          {
            LineText: "毎朝",
            Words: [{
              WordText: "毎朝",
              Left: 10,
              Top: 20,
              Width: 40,
              Height: 15,
            }],
          },
          {
            LineText: "コーヒー",
            Words: [{
              WordText: "コーヒー",
              Left: 10,
              Top: 40,
              Width: 80,
              Height: 15,
            }],
          },
        ],
      },
    }],
  };
  mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("ocr.local")) return jsonResponse({}, false, 500); // self-hosted down
    return jsonResponse(ocrSpaceBody); // OCR.space
  });

  const result = await runOcr(IMG, "a.png", "image/png");
  assert.equal(result.fullText, "毎朝\nコーヒー");
  assert.equal(result.blocks.length, 2);
  assert.equal(result.blocks[0].engine, "ocr-space");
  assert.equal(result.blocks[0].lang, "ja");
  assert.deepEqual(result.blocks[0].bbox, [[10, 20], [50, 20], [50, 35], [10, 35]]);
});

test("OCR_PROVIDERS overrides order and restricts eligible backends", async () => {
  // Both configured, but OCR_PROVIDERS forces ocr-space only.
  process.env.OCR_SERVICE_URL = "http://ocr.local";
  process.env.OCR_SPACE_API_KEY = "key";
  process.env.OCR_PROVIDERS = "ocr-space";
  const fetchMock = mock.method(globalThis, "fetch", async (url: string) => {
    assert.ok(url.includes("ocr.space"), `expected OCR.space, got ${url}`);
    return jsonResponse({
      IsErroredOnProcessing: false,
      ParsedResults: [{
        ParsedText: "本",
        TextOverlay: {
          Lines: [],
        },
      }],
    });
  });

  const result = await runOcr(IMG, "a.png", "image/png");
  assert.equal(result.fullText, "本");
  assert.equal(result.blocks[0].engine, "ocr-space");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("runOcr surfaces OcrUnavailableError when every configured backend fails", async () => {
  process.env.OCR_SERVICE_URL = "http://ocr.local";
  process.env.OCR_SPACE_API_KEY = "key";
  mock.method(globalThis, "fetch", async () => jsonResponse({}, false, 502));

  await assert.rejects(
    () => runOcr(IMG, "a.png", "image/png"),
    (err: unknown) => err instanceof OcrUnavailableError && /All OCR backends failed/.test(err.message),
  );
});

test("OCR.space processing error triggers fallback rather than a bogus result", async () => {
  process.env.OCR_SPACE_API_KEY = "key";
  process.env.GOOGLE_VISION_API_KEY = "gkey";
  mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("ocr.space")) {
      return jsonResponse({
        IsErroredOnProcessing: true,
        ErrorMessage: ["quota exceeded"],
      });
    }
    // Google Vision success
    return jsonResponse({
      responses: [{
        fullTextAnnotation: {
          text: "本\n",
          pages: [{
            blocks: [{
              confidence: 0.95,
              boundingBox: {
                vertices: [{
                  x: 1,
                  y: 2,
                }, {
                  x: 3,
                  y: 2,
                }, {
                  x: 3,
                  y: 4,
                }, {
                  x: 1,
                  y: 4,
                }],
              },
              paragraphs: [{
                words: [{
                  symbols: [{
                    text: "本",
                    property: {
                      detectedBreak: {
                        type: "LINE_BREAK",
                      },
                    },
                  }],
                }],
              }],
            }],
          }],
        },
      }],
    });
  });

  const result = await runOcr(IMG, "a.png", "image/png");
  assert.equal(result.fullText, "本");
  assert.equal(result.blocks[0].engine, "google-vision");
  assert.equal(result.blocks[0].confidence, 0.95);
  assert.deepEqual(result.blocks[0].bbox, [[1, 2], [3, 2], [3, 4], [1, 4]]);
});
