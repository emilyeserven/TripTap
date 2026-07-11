/** Pixel rectangle produced by react-easy-crop's `onCropComplete` (`croppedAreaPixels`). */
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cap the longest edge of a crop so the browser sends a reasonably sized upload. */
const MAX_EDGE = 2600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Could not load image for cropping")));
    img.src = src;
  });
}

/**
 * Draw the selected region of `imageSrc` to a canvas and return it as a JPEG `Blob`. The crop is
 * downscaled so its longest edge is at most {@link MAX_EDGE} — this trims the upload before it even
 * reaches the middleware (which also enforces per-provider size limits as a safety net).
 */
export async function getCroppedImg(imageSrc: string, crop: PixelCrop): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const scale = Math.min(1, MAX_EDGE / Math.max(crop.width, crop.height));
  const outWidth = Math.max(1, Math.round(crop.width * scale));
  const outHeight = Math.max(1, Math.round(crop.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outWidth,
    outHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error("Failed to encode cropped image"))),
      "image/jpeg",
      0.9,
    );
  });
}
