import type { OcrResult } from "@sentence-bank/types";
import type { OcrProvider } from "@/services/ocr/types";
import { fetchOcr } from "@/services/ocr/util";

/**
 * The self-hosted OCR backend (see `ocr-service/`): a PaddleOCR + manga-ocr FastAPI service,
 * typically running on a memory-rich LAN machine. The middleware does no OCR compute — it forwards
 * the image to `${selfHostedUrl}/ocr` as multipart and relays the service's `OcrResult` verbatim,
 * so `blocks`/`bbox`/`confidence`/`engine` already match our wire contract.
 */
export const selfHostedProvider: OcrProvider = {
  id: "self-hosted",

  isConfigured(config) {
    return Boolean(config.selfHostedUrl);
  },

  async recognize(config, buffer, filename, mimetype): Promise<OcrResult> {
    const baseUrl = config.selfHostedUrl as string;

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)], {
      type: mimetype,
    }), filename);

    const res = await fetchOcr(
      "OCR service",
      `${baseUrl.replace(/\/$/, "")}/ocr`,
      {
        method: "POST",
        body: form,
      },
    );
    return (await res.json()) as OcrResult;
  },
};
