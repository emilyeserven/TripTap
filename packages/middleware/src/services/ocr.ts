import type { OcrResult } from "@sentence-bank/types";

/** Raised when the OCR feature is used but `OCR_SERVICE_URL` is not configured. */
export class OcrNotConfiguredError extends Error {
  constructor() {
    super("OCR service not configured");
    this.name = "OcrNotConfiguredError";
  }
}

/** Raised when the configured OCR service is unreachable, times out, or errors. */
export class OcrUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrUnavailableError";
  }
}

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Forward an image to the external OCR service (see `ocr-service/`, typically running on a
 * memory-rich LAN machine) and return its recognition result. The middleware itself does no OCR
 * compute — it only proxies. Uses Node's global `fetch`/`FormData`/`Blob`, so no HTTP-client
 * dependency is required.
 */
export async function runOcr(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<OcrResult> {
  const baseUrl = process.env.OCR_SERVICE_URL;
  if (!baseUrl) throw new OcrNotConfiguredError();

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], {
    type: mimetype,
  }), filename);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}/ocr`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  }
  catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new OcrUnavailableError(`OCR service unreachable: ${reason}`);
  }
  finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new OcrUnavailableError(`OCR service returned ${res.status}`);
  }

  return (await res.json()) as OcrResult;
}
