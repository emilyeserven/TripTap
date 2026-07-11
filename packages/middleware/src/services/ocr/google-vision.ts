import type { OcrBlock, OcrResult } from "@sentence-bank/types";
import type { OcrProvider } from "@/services/ocr/types";
import { OcrUnavailableError } from "@/services/ocr/errors";
import { fitImageToBytes, GOOGLE_VISION_MAX_BYTES } from "@/services/ocr/image";
import { detectLang, normalizeNewlines, REQUEST_TIMEOUT_MS } from "@/services/ocr/util";

/** Subset of the Vision `images:annotate` response we consume. */
interface Vertex {
  x?: number;
  y?: number;
}
interface Symbol_ {
  text?: string;
  property?: { detectedBreak?: { type?: string } };
}
interface Word {
  symbols?: Symbol_[];
}
interface Paragraph {
  words?: Word[];
}
interface Block {
  boundingBox?: { vertices?: Vertex[] };
  confidence?: number;
  paragraphs?: Paragraph[];
}
interface Page {
  blocks?: Block[];
}
interface AnnotateResponse {
  responses?: {
    fullTextAnnotation?: { text?: string;
      pages?: Page[]; };
    error?: { message?: string };
  }[];
}

/** Whitespace that Vision's `detectedBreak` implies follows a symbol. */
function breakWhitespace(type: string | undefined): string {
  switch (type) {
    case "SPACE":
    case "SURE_SPACE":
      return " ";
    case "EOL_SURE_SPACE":
    case "LINE_BREAK":
      return "\n";
    default:
      return "";
  }
}

/** Reconstruct a block's text from its symbol tree, honoring Vision's detected line/word breaks. */
function blockText(block: Block): string {
  let out = "";
  for (const para of block.paragraphs ?? []) {
    for (const word of para.words ?? []) {
      for (const sym of word.symbols ?? []) {
        out += sym.text ?? "";
        out += breakWhitespace(sym.property?.detectedBreak?.type);
      }
    }
  }
  return out.trim();
}

/** Map Vision's up-to-4 vertices to our fixed quad, defaulting omitted zero coords. */
function toBbox(vertices: Vertex[] | undefined): [number, number][] {
  return (vertices ?? []).map(v => [v.x ?? 0, v.y ?? 0] as [number, number]);
}

/**
 * Google Cloud Vision cloud backend (DOCUMENT_TEXT_DETECTION), authenticated with a plain API key.
 * Best-in-class accuracy for Japanese/CJK. Free for the first 1,000 requests/month, then paid.
 * The `engine` label is `google-vision`. Credentials come from the resolved config
 * (`googleVision.apiKey`), sourced from the DB Settings first, then environment variables.
 */
export const googleVisionProvider: OcrProvider = {
  id: "google-vision",

  isConfigured(config) {
    return Boolean(config.googleVision.apiKey);
  },

  async recognize(config, buffer, filename, mimetype): Promise<OcrResult> {
    const url = `${config.googleVision.url}?key=${encodeURIComponent(config.googleVision.apiKey as string)}`;

    // Keep the base64 payload under Vision's 10 MB JSON request limit (base64 inflates ~37%).
    const image = await fitImageToBytes(buffer, mimetype, filename, GOOGLE_VISION_MAX_BYTES);

    const body = JSON.stringify({
      requests: [{
        image: {
          content: image.buffer.toString("base64"),
        },
        features: [{
          type: "DOCUMENT_TEXT_DETECTION",
        }],
        imageContext: {
          languageHints: ["ja", "en"],
        },
      }],
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body,
        signal: controller.signal,
      });
    }
    catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new OcrUnavailableError(`Google Vision unreachable: ${reason}`);
    }
    finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      // Vision reports auth/quota errors in the JSON body even on non-2xx; include it if present.
      const detail = await res.text().catch(() => "");
      throw new OcrUnavailableError(`Google Vision returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }

    const data = (await res.json()) as AnnotateResponse;
    const result = data.responses?.[0];
    if (result?.error?.message) {
      throw new OcrUnavailableError(`Google Vision failed: ${result.error.message}`);
    }

    const annotation = result?.fullTextAnnotation;
    const fullText = normalizeNewlines(annotation?.text ?? "").trim();

    const blocks: OcrBlock[] = [];
    for (const page of annotation?.pages ?? []) {
      for (const block of page.blocks ?? []) {
        const text = blockText(block);
        if (text.length === 0) continue;
        blocks.push({
          text,
          bbox: toBbox(block.boundingBox?.vertices),
          confidence: block.confidence ?? 1,
          lang: detectLang(text),
          engine: "google-vision",
        });
      }
    }

    return {
      blocks,
      fullText,
    };
  },
};
