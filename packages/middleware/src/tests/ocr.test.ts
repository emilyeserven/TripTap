import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";

// Runs without a database or the external OCR service: exercises the multipart wiring and the
// "OCR service not configured" path.

/** Build a minimal `multipart/form-data` body carrying a single `file` field. */
function multipartPayload(boundary: string): Buffer {
  const head = Buffer.from(
    `--${boundary}\r\n`
    + "Content-Disposition: form-data; name=\"file\"; filename=\"test.png\"\r\n"
    + "Content-Type: image/png\r\n\r\n",
  );
  const body = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG magic bytes stand in for an image
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, body, tail]);
}

test("POST /api/ocr returns 503 when OCR_SERVICE_URL is not configured", async () => {
  delete process.env.OCR_SERVICE_URL;
  const app = await buildApp();
  const boundary = "----sentencebanktest";
  const res = await app.inject({
    method: "POST",
    url: "/api/ocr",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: multipartPayload(boundary),
  });
  assert.equal(res.statusCode, 503);
  assert.match((res.json() as { message: string }).message, /not configured/);
  await app.close();
});
