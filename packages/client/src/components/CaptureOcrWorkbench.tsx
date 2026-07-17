import type { OcrResult } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { CaptureExtractedText } from "@/components/CaptureExtractedText";
import { CaptureForm } from "@/components/CaptureForm";
import { CaptureImagePicker } from "@/components/CaptureImagePicker";
import { CropDialog } from "@/components/CropDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOcr } from "@/hooks/useOcr";

/**
 * The capture page's OCR workbench: pick/drop an image, crop it, run OCR, edit the extracted text,
 * and save it as a capture. The route stays a thin wrapper; `onSaved` receives the new capture id.
 */
export function CaptureOcrWorkbench({
  onSaved,
}: {
  onSaved: (id: string) => void;
}) {
  // The originally selected image: source for both the preview and the crop dialog. Kept alive
  // (not revoked on crop) so the user can re-open the cropper and try a different region.
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<OcrResult | null>(null);
  // The exact image OCR'd (cropped blob or original) — stored with the capture on save.
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const ocr = useOcr();

  const engines = result ? [...new Set(result.blocks.map(b => b.engine))] : [];

  // Release the object URL when it changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

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

  return (
    <>
      <CaptureImagePicker
        sourceUrl={sourceUrl}
        busy={ocr.isPending}
        onSelectFile={selectFile}
        onOpenCrop={() => setCropOpen(true)}
      />

      {sourceUrl && (
        <CropDialog
          imageUrl={sourceUrl}
          open={cropOpen}
          onCancel={() => setCropOpen(false)}
          onUseFull={onUseFull}
          onConfirm={onCropConfirm}
        />
      )}

      <CaptureExtractedText
        text={text}
        onTextChange={setText}
        pending={ocr.isPending}
        errorMessage={ocr.isError
          ? (ocr.error instanceof Error ? ocr.error.message : "OCR failed.")
          : null}
        engines={engines}
        canSave={Boolean(result)}
        onSave={() => setSaveOpen(true)}
      />

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
                onSaved(id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
