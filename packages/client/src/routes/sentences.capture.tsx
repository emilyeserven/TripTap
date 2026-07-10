import { useRef, useState } from "react";

import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Camera, Check, Copy, ScanText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useOcr } from "@/hooks/useOcr";

export const Route = createFileRoute("/sentences/capture")({
  component: CapturePage,
});

function CapturePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [engines, setEngines] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const ocr = useOcr();

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset any previous result and swap the preview image.
    setText("");
    setEngines([]);
    ocr.reset();
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });

    ocr.mutate(file, {
      onSuccess: (result) => {
        setText(result.fullText);
        setEngines([...new Set(result.blocks.map(b => b.engine))]);
      },
    });
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
          to="/sentences"
          className="
            mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground
            hover:underline
          "
        >
          <ArrowLeft className="size-3.5" />
          Sentences
        </Link>
        <h1 className="text-2xl font-bold">Capture text</h1>
        <p className="text-sm text-muted-foreground">
          Photograph or upload a page and extract its Japanese and English text.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Image</CardTitle>
          <CardDescription>
            On a phone this opens the camera; on desktop it opens a file picker.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onSelect}
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={ocr.isPending}
          >
            <Camera className="size-4" />
            {previewUrl ? "Choose another image" : "Choose or capture image"}
          </Button>

          {previewUrl && (
            <img
              src={previewUrl}
              alt="Selected page"
              className="max-h-80 w-auto rounded-md border border-input"
            />
          )}
        </CardContent>
      </Card>

      {(ocr.isPending || ocr.isError || text) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanText className="size-4" />
              Extracted text
            </CardTitle>
            <CardDescription>
              Edit as needed, then copy. Text is not saved automatically.
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
                <div className="flex items-center gap-2">
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
    </section>
  );
}
