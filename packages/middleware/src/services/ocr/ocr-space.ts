import type { OcrBlock, OcrResult } from "@sentence-bank/types";
import type { OcrProvider } from "@/services/ocr/types";
import { OcrUnavailableError } from "@/services/ocr/errors";
import { detectLang, fetchOcr, normalizeNewlines } from "@/services/ocr/util";

const DEFAULT_URL = "https://api.ocr.space/parse/image";
const DEFAULT_LANGUAGE = "jpn";
const DEFAULT_ENGINE = "2"; // Engine 2 supports Japanese, including vertical text.

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
 * `ocr-space`.
 *
 * Config: `OCR_SPACE_API_KEY` (required), `OCR_SPACE_ENGINE` (default 2), `OCR_SPACE_LANGUAGE`
 * (default jpn), `OCR_SPACE_URL` (endpoint override).
 */
export const ocrSpaceProvider: OcrProvider = {
  id: "ocr-space",

  isConfigured() {
    return Boolean(process.env.OCR_SPACE_API_KEY);
  },

  async recognize(buffer, filename, mimetype): Promise<OcrResult> {
    const url = process.env.OCR_SPACE_URL || DEFAULT_URL;

    const form = new FormData();
    form.append("apikey", process.env.OCR_SPACE_API_KEY as string);
    form.append("language", process.env.OCR_SPACE_LANGUAGE || DEFAULT_LANGUAGE);
    form.append("OCREngine", process.env.OCR_SPACE_ENGINE || DEFAULT_ENGINE);
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
