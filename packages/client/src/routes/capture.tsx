import type { OcrResult } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Check, Copy, Crop, Save, ScanText } from "lucide-react";

import { CaptureForm } from "@/components/CaptureForm";
import { CropDialog } from "@/components/CropDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useOcr } from "@/hooks/useOcr";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/capture")({
  component: CapturePage,
});

function CapturePage() {
  usePageTitle("Capture text");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  // The originally selected image: source for both the preview and the crop dialog. Kept alive
  // (not revoked on crop) so the user can re-open the cropper and try a different region.
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<OcrResult | null>(null);
  // The exact image OCR'd (cropped blob or original) — stored with the capture on save.
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ocr = useOcr();

  const engines = result ? [...new Set(result.blocks.map(b => b.engine))] : [];

  // Release the object URL when it changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

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

  function runOcr(file: File) {
    setCapturedBlob(file);
    ocr.mutate(file, {
      onSuccess: (ocrResult: OcrResult) => {
        setResult(ocrResult);
        setText(ocrResult.fullText);
      },
    });
  }

  /** Common entry point for a chosen/dropped image: reset state, preview it, and open the cropper. */
  function selectFile(file: File) {
    setText("");
    setResult(null);
    setCapturedBlob(null);
    ocr.reset();
    setSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setOriginalFile(file);
    setCropOpen(true);
  }

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectFile(file);
    // Allow re-selecting the same file later (onChange won't fire otherwise).
    event.target.value = "";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = [...(event.dataTransfer.files ?? [])].find(f => f.type.startsWith("image/"));
    if (file) selectFile(file);
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (!dragging) setDragging(true);
  }

  function onDragLeave(event: React.DragEvent) {
    // Ignore leaves into child elements; only clear when the pointer exits the zone.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
  }

  function onCropConfirm(blob: Blob) {
    setCropOpen(false);
    runOcr(new File([blob], "capture.jpg", {
      type: "image/jpeg",
    }));
  }

  function onUseFull() {
    setCropOpen(false);
    if (originalFile) runOcr(originalFile);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1500);
    }
    catch {
      // Clipboard may be unavailable; the textarea is selectable as a fallback.
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          to="/captures"
          className="
            mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground
            hover:underline
          "
        >
          <ArrowLeft className="size-3.5" />
          Captures
        </Link>
        <p className="text-sm text-muted-foreground">
          Take a photo or choose an image, and extract its Japanese and English text.
        </p>
      </div>

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
              `
                space-y-3 rounded-md border-2 border-dashed p-4
                transition-colors
              `,
              dragging ? "border-blue-500 bg-blue-50/60" : "border-input",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={ocr.isPending}
              >
                <Camera className="size-4" />
                {sourceUrl ? "Choose another image" : "Choose or capture image"}
              </Button>
              {sourceUrl && (
                <Button
                  variant="outline"
                  onClick={() => setCropOpen(true)}
                  disabled={ocr.isPending}
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

      {sourceUrl && (
        <CropDialog
          imageUrl={sourceUrl}
          open={cropOpen}
          onCancel={() => setCropOpen(false)}
          onUseFull={onUseFull}
          onConfirm={onCropConfirm}
        />
      )}

      {(ocr.isPending || ocr.isError || text) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanText className="size-4" />
              Extracted text
            </CardTitle>
            <CardDescription>
              Edit as needed, then save it as a capture to parse into sentences later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ocr.isPending && (
              <p className="text-sm text-muted-foreground">Extracting text…</p>
            )}

            {ocr.isError && (
              <p className="text-sm text-destructive">
                {ocr.error instanceof Error ? ocr.error.message : "OCR failed."}
              </p>
            )}

            {text && (
              <>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={8}
                  aria-label="Extracted text"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={copy}
                  >
                    {copied
                      ? <Check className="size-4" />
                      : (
                        <Copy
                          className="size-4"
                        />
                      )}
                    {copied ? "Copied" : "Copy text"}
                  </Button>
                  <Button
                    onClick={() => setSaveOpen(true)}
                    disabled={!result}
                  >
                    <Save className="size-4" />
                    Save capture
                  </Button>
                  {engines.map(engine => (
                    <Badge
                      key={engine}
                      variant="secondary"
                    >
                      {engine}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Save capture</DialogTitle>
          </DialogHeader>
          {/* Mounted only while open so it captures the latest edited text and OCR result. */}
          {saveOpen && result && (
            <CaptureForm
              text={text}
              blocks={result.blocks}
              engines={engines}
              image={capturedBlob}
              onSaved={(id) => {
                setSaveOpen(false);
                void navigate({
                  to: "/captures/$id",
                  params: {
                    id,
                  },
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
