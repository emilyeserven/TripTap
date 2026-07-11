import type { Crop, PercentCrop, PixelCrop } from "react-image-crop";

import { useRef, useState } from "react";

import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCroppedImg } from "@/lib/cropImage";

/** Aspect presets. `undefined` means free-form — the user drags any rectangle. */
const ASPECTS = [
  {
    label: "Free",
    value: undefined,
  },
  {
    label: "Portrait",
    value: 3 / 4,
  },
  {
    label: "Square",
    value: 1,
  },
  {
    label: "Landscape",
    value: 4 / 3,
  },
] as const;

/** Center a starting crop covering ~80% of the image, optionally constrained to an aspect ratio. */
function initialCrop(width: number, height: number, aspect: number | undefined): Crop {
  const base: PercentCrop = aspect
    ? makeAspectCrop({
      unit: "%",
      width: 80,
    }, aspect, width, height)
    : {
      unit: "%",
      x: 10,
      y: 10,
      width: 80,
      height: 80,
    };
  return centerCrop(base, width, height);
}

/**
 * Modal cropper for the Capture flow. The user drags a rectangle over the image — free-form by
 * default, or constrained to an aspect preset — then either crops or sends the full image. On confirm
 * it hands back a JPEG {@link Blob} of the selected region (already downscaled by
 * {@link getCroppedImg}); the middleware still enforces per-provider size limits as a safety net.
 */
export function CropDialog({
  imageUrl,
  open,
  onCancel,
  onUseFull,
  onConfirm,
}: {
  imageUrl: string;
  open: boolean;
  onCancel: () => void;
  onUseFull: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const {
      width, height,
    } = e.currentTarget;
    setCrop(initialCrop(width, height, aspect));
  }

  function chooseAspect(next: number | undefined) {
    setAspect(next);
    const img = imgRef.current;
    if (img) setCrop(initialCrop(img.width, img.height, next));
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) return;
    setBusy(true);
    setError(null);
    try {
      // The crop is in displayed-image pixels; scale to the image's natural resolution.
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const blob = await getCroppedImg(imageUrl, {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
      });
      onConfirm(blob);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop image");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
          <DialogDescription>
            Drag to frame just the text you want to read — this improves accuracy and shrinks the upload.
          </DialogDescription>
        </DialogHeader>

        <div
          className="
            flex max-h-[60vh] justify-center overflow-auto rounded-md bg-muted
          "
        >
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop source"
              onLoad={onImageLoad}
              className="max-h-[60vh] w-auto"
            />
          </ReactCrop>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ASPECTS.map(a => (
            <Button
              key={a.label}
              type="button"
              size="sm"
              variant={aspect === a.value ? "default" : "outline"}
              onClick={() => chooseAspect(a.value)}
            >
              {a.label}
            </Button>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onUseFull}
            disabled={busy}
          >
            Use full image
          </Button>
          <Button
            type="button"
            onClick={() => void confirm()}
            disabled={busy || !completedCrop?.width}
          >
            {busy ? "Preparing…" : "Crop & extract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
