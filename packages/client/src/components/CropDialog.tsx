import type { Area } from "react-easy-crop";

import { useCallback, useState } from "react";

import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { getCroppedImg } from "@/lib/cropImage";

const ASPECTS = [
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

/**
 * Modal cropper for the Capture flow. The user frames the text region (pan + zoom), then either
 * crops or sends the full image. On confirm it hands back a JPEG {@link Blob} of the selected region
 * (already downscaled by {@link getCroppedImg}); the middleware still enforces per-provider size
 * limits as a safety net.
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
  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(3 / 4);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, croppedAreaPixels: Area) => {
    setAreaPixels(croppedAreaPixels);
  }, []);

  async function confirm() {
    if (!areaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedImg(imageUrl, areaPixels);
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
            Frame just the text you want to read — this improves accuracy and shrinks the upload.
          </DialogDescription>
        </DialogHeader>

        <div
          className="relative h-72 w-full overflow-hidden rounded-md bg-muted"
        >
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {ASPECTS.map(a => (
              <Button
                key={a.label}
                type="button"
                size="sm"
                variant={aspect === a.value ? "default" : "outline"}
                onClick={() => setAspect(a.value)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="w-10 text-xs text-muted-foreground">Zoom</span>
            <Slider
              min={1}
              max={4}
              step={0.01}
              value={[zoom]}
              onValueChange={([z]) => setZoom(z)}
              className="max-w-xs"
              aria-label="Zoom"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

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
            disabled={busy || !areaPixels}
          >
            {busy ? "Preparing…" : "Crop & extract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
