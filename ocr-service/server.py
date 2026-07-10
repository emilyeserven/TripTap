"""OCR service for sentence-bank.

Runs PaddleOCR (Japanese + English + layout detection) as the primary engine, with
manga-ocr as a confidence-based rescue for low-confidence Japanese blocks. Both models
are loaded once at startup and kept warm, so requests only pay inference time.

This service is meant to run on a machine with enough memory/CPU (e.g. the Windows box on
the LAN) — the Raspberry Pi middleware proxies images to it via ``OCR_SERVICE_URL``.

Configuration (environment variables; a local ``.env`` file is loaded automatically):
  OCR_PORT                  Port to bind (default 8000). Change it if the port is taken.
  OCR_HOST                  Bind address (default 0.0.0.0 so the LAN can reach it).
  OCR_CONFIDENCE_THRESHOLD  Japanese blocks read below this confidence are re-read by
                            manga-ocr (default 0.8).
"""

from __future__ import annotations

import io
import os

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from PIL import Image

# Heavy imports — loaded once, at import time, so the first request is fast.
from manga_ocr import MangaOcr
from paddleocr import PaddleOCR

load_dotenv()

CONFIDENCE_THRESHOLD = float(os.environ.get("OCR_CONFIDENCE_THRESHOLD", "0.8"))

app = FastAPI(title="sentence-bank OCR service")

# ``lang="japan"`` recognizes Japanese and also covers Latin/English characters, so a
# single PaddleOCR instance handles mixed pages. manga-ocr is the Japanese specialist.
_paddle = PaddleOCR(use_angle_cls=True, lang="japan", show_log=False)
_manga = MangaOcr()


def _has_japanese(text: str) -> bool:
    """True if the string contains any hiragana, katakana, or CJK ideographs."""
    for ch in text:
        code = ord(ch)
        if (
            0x3040 <= code <= 0x30FF  # hiragana + katakana
            or 0x4E00 <= code <= 0x9FFF  # CJK unified ideographs
            or 0x3400 <= code <= 0x4DBF  # CJK extension A
        ):
            return True
    return False


def _crop(image: Image.Image, box) -> Image.Image:
    """Crop the axis-aligned bounding rectangle around a PaddleOCR quad box."""
    xs = [pt[0] for pt in box]
    ys = [pt[1] for pt in box]
    return image.crop((int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))))


@app.get("/health")
def health() -> dict:
    """Liveness probe used by the middleware and setup smoke test."""
    return {"status": "ok"}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)) -> dict:
    """Recognize text in an uploaded image and return per-block results."""
    raw = await file.read()
    image = Image.open(io.BytesIO(raw)).convert("RGB")

    result = _paddle.ocr(np.array(image), cls=True)

    blocks = []
    # PaddleOCR returns a list-per-image; for a single image the lines are in result[0].
    lines = result[0] if result and result[0] else []
    for box, (text, confidence) in lines:
        lang = "ja" if _has_japanese(text) else "en"
        engine = "paddleocr"
        conf = float(confidence)
        # Rescue low-confidence Japanese blocks with manga-ocr, which is stronger on JP.
        if lang == "ja" and conf < CONFIDENCE_THRESHOLD:
            rescued = _manga(_crop(image, box))
            if rescued:
                text = rescued
                engine = "manga-ocr"
        blocks.append(
            {
                "text": text,
                "bbox": [[float(pt[0]), float(pt[1])] for pt in box],
                "confidence": conf,
                "lang": lang,
                "engine": engine,
            }
        )

    full_text = "\n".join(b["text"] for b in blocks)
    return {"blocks": blocks, "fullText": full_text}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.environ.get("OCR_HOST", "0.0.0.0"),
        port=int(os.environ.get("OCR_PORT", "8000")),
    )
