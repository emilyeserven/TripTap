import type { OcrBlock, OcrResult } from "@sentence-bank/types";
import type { OcrProvider } from "@/services/ocr/types";
import { OcrUnavailableError } from "@/services/ocr/errors";
import { detectLang, fetchOcr, normalizeNewlines } from "@/services/ocr/util";

/** Subset of the OCR.space `/parse/image` response we consume. */
interface OcrSpaceWord {
  WordText: string;
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}
interface OcrSpaceLine {
  LineText: string;
  Words?: OcrSpaceWord[];
}
interface OcrSpaceResult {
  ParsedText?: string;
  TextOverlay?: { Lines?: OcrSpaceLine[] };
}
interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceResult[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
}

/** Build a top-left → top-right → bottom-right → bottom-left quad enclosing a line's words. */
function lineBbox(words: OcrSpaceWord[]): [number, number][] {
  if (words.length === 0) return [];
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const w of words) {
    left = Math.min(left, w.Left);
    top = Math.min(top, w.Top);
    right = Math.max(right, w.Left + w.Width);
    bottom = Math.max(bottom, w.Top + w.Height);
  }
  return [[left, top], [right, top], [right, bottom], [left, bottom]];
}

/**
 * OCR.space cloud backend (https://ocr.space/ocrapi). A zero-registration free tier (25k
 * requests/month) makes it a good "just in case" alternative to the self-hosted service. OCR.space
 * exposes no per-line confidence, so blocks are reported at confidence `1`; the `engine` label is
 * `ocr-space`. Credentials/tuning come from the resolved config (`ocrSpace.apiKey` etc.), which is
 * sourced from the DB Settings first, then environment variables.
 */
export const ocrSpaceProvider: OcrProvider = {
  id: "ocr-space",

  isConfigured(config) {
    return Boolean(config.ocrSpace.apiKey);
  },

  async recognize(config, buffer, filename, mimetype): Promise<OcrResult> {
    const {
      apiKey, engine, language, url,
    } = config.ocrSpace;

    const form = new FormData();
    form.append("apikey", apiKey as string);
    form.append("language", language);
    form.append("OCREngine", engine);
    form.append("isOverlayRequired", "true");
    form.append("file", new Blob([new Uint8Array(buffer)], {
      type: mimetype,
    }), filename);

    const res = await fetchOcr("OCR.space", url, {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as OcrSpaceResponse;

    // HTTP 200 can still carry a processing error; surface it as unavailable so the chain falls back.
    if (data.IsErroredOnProcessing) {
      const msg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join("; ")
        : data.ErrorMessage ?? "unknown error";
      throw new OcrUnavailableError(`OCR.space failed: ${msg}`);
    }

    const parsed = data.ParsedResults?.[0];
    const fullText = normalizeNewlines(parsed?.ParsedText ?? "").trim();

    const lines = parsed?.TextOverlay?.Lines ?? [];
    let blocks: OcrBlock[] = lines
      .filter(line => line.LineText.trim().length > 0)
      .map(line => ({
        text: line.LineText,
        bbox: lineBbox(line.Words ?? []),
        confidence: 1,
        lang: detectLang(line.LineText),
        engine: "ocr-space",
      }));

    // No overlay (e.g. some engines/inputs) — still return the recognized text as one block.
    if (blocks.length === 0 && fullText.length > 0) {
      blocks = [{
        text: fullText,
        bbox: [],
        confidence: 1,
        lang: detectLang(fullText),
        engine: "ocr-space",
      }];
    }

    return {
      blocks,
      fullText,
    };
  },
};
