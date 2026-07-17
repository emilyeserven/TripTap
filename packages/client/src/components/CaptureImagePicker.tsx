import { useEffect, useRef, useState } from "react";

import { Camera, Crop } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The image-selection card of the capture page: file picker, drag & drop zone, preview, and the
 * re-crop button. Owns only the drag-highlight state; the chosen file goes up via `onSelectFile`.
 */
export function CaptureImagePicker({
  sourceUrl,
  busy,
  onSelectFile,
  onOpenCrop,
}: {
  /** Object URL of the currently selected image, or null before one is chosen. */
  sourceUrl: string | null;
  busy: boolean;
  onSelectFile: (file: File) => void;
  onOpenCrop: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Swallow drops that miss the drop zone so the browser doesn't navigate to the dropped file.
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    globalThis.addEventListener("dragover", prevent);
    globalThis.addEventListener("drop", prevent);
    return () => {
      globalThis.removeEventListener("dragover", prevent);
      globalThis.removeEventListener("drop", prevent);
    };
  }, []);

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onSelectFile(file);
    // Allow re-selecting the same file later (onChange won't fire otherwise).
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = [...(event.dataTransfer.files ?? [])].find(f => f.type.startsWith("image/"));
    if (file) onSelectFile(file);
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (!dragging) setDragging(true);
  }

  function onDragLeave(event: React.DragEvent) {
    // Ignore leaves into child elements; only clear when the pointer exits the zone.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image</CardTitle>
        <CardDescription>
          Take a photo, pick one from your library, or drag &amp; drop an image here (desktop).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onSelect}
        />
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "space-y-3 rounded-md border-2 border-dashed p-4 transition-colors",
            dragging ? "border-blue-500 bg-blue-50/60" : "border-input",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Camera className="size-4" />
              {sourceUrl ? "Choose another image" : "Choose or capture image"}
            </Button>
            {sourceUrl && (
              <Button
                variant="outline"
                onClick={onOpenCrop}
                disabled={busy}
              >
                <Crop className="size-4" />
                Crop
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {dragging ? "Drop the image to use it" : "or drag & drop an image here"}
            </span>
          </div>

          {sourceUrl && (
            <img
              src={sourceUrl}
              alt="Selected page"
              className="max-h-80 w-auto rounded-md border border-input"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
