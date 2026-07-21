import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { OcrUnavailableError } from "@/services/ocr/errors";
import { detectLang, fetchOcr, normalizeNewlines } from "@/services/ocr/util";

// Unit tests for the OCR text/script helpers and the timeout-wrapped `fetch`. `fetch` is mocked, so
// no backend is contacted.

afterEach(() => mock.restoreAll());

describe("detectLang", () => {
  it("tags kana as ja", () => {
    assert.equal(detectLang("ひらがな"), "ja");
    assert.equal(detectLang("カタカナ"), "ja");
  });

  it("tags kanji as ja", () => {
    assert.equal(detectLang("日本語"), "ja");
  });

  it("tags Latin-only text as en", () => {
    assert.equal(detectLang("hello world"), "en");
    assert.equal(detectLang(""), "en");
  });

  it("tags mixed text containing any Japanese as ja", () => {
    assert.equal(detectLang("Order 寿司 please"), "ja");
  });
});

describe("normalizeNewlines", () => {
  it("converts CRLF to LF", () => {
    assert.equal(normalizeNewlines("a\r\nb"), "a\nb");
  });

  it("converts a lone CR to LF", () => {
    assert.equal(normalizeNewlines("a\rb"), "a\nb");
  });

  it("leaves LF untouched and handles mixed endings", () => {
    assert.equal(normalizeNewlines("a\nb\r\nc\rd"), "a\nb\nc\nd");
  });
});

describe("fetchOcr", () => {
  it("returns the response on a 2xx", async () => {
    const ok = {
      ok: true,
      status: 200,
    } as Response;
    mock.method(globalThis, "fetch", async () => ok);

    const res = await fetchOcr("OCR.space", "https://ocr.test", {
      method: "POST",
    });
    assert.equal(res, ok);
  });

  it("maps a thrown fetch to OcrUnavailableError naming the backend", async () => {
    mock.method(globalThis, "fetch", async () => {
      throw new Error("ETIMEDOUT");
    });

    await assert.rejects(
      () => fetchOcr("OCR.space", "https://ocr.test", {}),
      (err: Error) => {
        assert.ok(err instanceof OcrUnavailableError);
        assert.match(err.message, /OCR\.space unreachable: ETIMEDOUT/);
        return true;
      },
    );
  });

  it("maps a non-2xx response to OcrUnavailableError with the status", async () => {
    mock.method(globalThis, "fetch", async () => ({
      ok: false,
      status: 429,
    } as Response));

    await assert.rejects(
      () => fetchOcr("Google Vision", "https://ocr.test", {}),
      (err: Error) => {
        assert.ok(err instanceof OcrUnavailableError);
        assert.match(err.message, /Google Vision returned 429/);
        return true;
      },
    );
  });
});
