import { Jimp } from "jimp";

/** Per-provider upload budgets. OCR.space's free API rejects >1 MB with HTTP 413. */
export const OCR_SPACE_MAX_BYTES = 1_000_000;
/** Google Vision caps the JSON request at 10 MB; base64 inflates ~37%, so keep the raw image well under. */
export const GOOGLE_VISION_MAX_BYTES = 7_000_000;

/** Longest edge to cap at before the first re-encode — plenty of resolution for OCR, far below phone-photo sizes. */
const MAX_EDGE = 2600;
/** Never shrink the longest edge below this — text needs resolution to stay legible. */
const MIN_EDGE = 1000;
/** JPEG quality ladder, tried high→low before shrinking dimensions. */
const QUALITIES = [85, 72, 60, 48, 38];
/** Hard cap on shrink iterations, a backstop against a pathological loop. */
const MAX_SHRINK_STEPS = 6;

/** An image ready to send to a provider, possibly re-encoded to fit a byte budget. */
export interface PreparedImage {
  buffer: Buffer;
  mimetype: string;
  filename: string;
}

/** Replace a filename's extension with `.jpg` (we re-encode to JPEG when shrinking). */
function toJpegName(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "") + ".jpg";
}

/**
 * Ensure an image fits within `maxBytes`, downscaling and re-encoding to JPEG only when necessary.
 * This is what lets a multi-megabyte phone photo reach a size-limited cloud OCR backend (e.g.
 * OCR.space's 1 MB free-tier cap) instead of failing with HTTP 413.
 *
 * - Already within budget → returned unchanged (never degrade a small image).
 * - Otherwise: cap the longest edge, then walk the JPEG-quality ladder; if still over budget, scale
 *   down and retry, down to a resolution floor. Returns the smallest result produced.
 * - Undecodable input (e.g. HEIC) → returned unchanged; the provider then errors and the OCR chain
 *   falls back, rather than the whole request hard-failing here.
 */
export async function fitImageToBytes(
  buffer: Buffer,
  mimetype: string,
  filename: string,
  maxBytes: number,
): Promise<PreparedImage> {
  if (buffer.length <= maxBytes) {
    return {
      buffer,
      mimetype,
      filename,
    };
  }

  let image;
  try {
    image = await Jimp.read(buffer);
  }
  catch {
    return {
      buffer,
      mimetype,
      filename,
    };
  }

  // Cap the longest edge first (guarded so a small image is never upscaled).
  if (Math.max(image.width, image.height) > MAX_EDGE) {
    image.scaleToFit({
      w: MAX_EDGE,
      h: MAX_EDGE,
    });
  }

  const jpegName = toJpegName(filename);
  let smallest: Buffer | null = null;

  for (let step = 0; step < MAX_SHRINK_STEPS; step++) {
    for (const quality of QUALITIES) {
      const out = await image.getBuffer("image/jpeg", {
        quality,
      });
      if (out.length <= maxBytes) {
        return {
          buffer: out,
          mimetype: "image/jpeg",
          filename: jpegName,
        };
      }
      if (!smallest || out.length < smallest.length) smallest = out;
    }
    if (Math.max(image.width, image.height) <= MIN_EDGE) break;
    image.scale(0.85);
  }

  // Never got under budget — send the smallest JPEG we made (provider may still 413 → chain falls back).
  return smallest
    ? {
      buffer: smallest,
      mimetype: "image/jpeg",
      filename: jpegName,
    }
    : {
      buffer,
      mimetype,
      filename,
    };
}
