import assert from "node:assert/strict";
import { test } from "node:test";
import { Jimp } from "jimp";
import { fitImageToBytes } from "@/services/ocr/image";

// Unit tests for the OCR image-size preprocessing (no DB/network). Uses jimp to synthesize inputs.

/** A large, noisy PNG that comfortably exceeds a 1 MB budget (random pixels resist compression). */
async function bigImage(): Promise<Buffer> {
  const w = 3200;
  const h = 2400;
  const img = new Jimp({
    width: w,
    height: h,
    color: 0x000000ff,
  });
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const v = ((x * 31 + y * 17) % 256);
      img.setPixelColor(((v << 24) | ((255 - v) << 16) | ((v * 2) << 8) | 0xff) >>> 0, x, y);
    }
  }
  return img.getBuffer("image/png");
}

test("fitImageToBytes shrinks an oversized image under the budget", async () => {
  const input = await bigImage();
  const maxBytes = 1_000_000;
  assert.ok(input.length > maxBytes, `precondition: input ${input.length} should exceed ${maxBytes}`);

  const out = await fitImageToBytes(input, "image/png", "photo.png", maxBytes);

  assert.ok(out.buffer.length <= maxBytes, `output ${out.buffer.length} should be <= ${maxBytes}`);
  assert.ok(out.buffer.length < input.length, "output should be smaller than input");
  assert.equal(out.mimetype, "image/jpeg");
  assert.equal(out.filename, "photo.jpg");
  // The result must still be a valid, decodable image.
  const decoded = await Jimp.read(out.buffer);
  assert.ok(decoded.width > 0 && decoded.height > 0);
});

test("fitImageToBytes leaves an already-small image untouched", async () => {
  const small = await new Jimp({
    width: 20,
    height: 20,
    color: 0xffffffff,
  }).getBuffer("image/png");
  assert.ok(small.length < 1_000_000);

  const out = await fitImageToBytes(small, "image/png", "tiny.png", 1_000_000);

  assert.equal(out.buffer, small); // same buffer reference — no re-encode
  assert.equal(out.mimetype, "image/png");
  assert.equal(out.filename, "tiny.png");
});

test("fitImageToBytes passes undecodable input through unchanged", async () => {
  // Simulate e.g. a HEIC/garbage payload larger than the budget that jimp can't read.
  const garbage = Buffer.alloc(1_200_000, 7);

  const out = await fitImageToBytes(garbage, "image/heic", "shot.heic", 1_000_000);

  assert.equal(out.buffer, garbage);
  assert.equal(out.mimetype, "image/heic");
  assert.equal(out.filename, "shot.heic");
});
