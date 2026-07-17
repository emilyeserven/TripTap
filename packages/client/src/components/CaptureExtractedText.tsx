import { useState } from "react";

import { Check, Copy, Save, ScanText } from "lucide-react";

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

/**
 * The extracted-text card of the capture page: OCR progress/error states, the editable text, the
 * copy button, engine badges, and the save trigger. Renders nothing until OCR has started.
 */
export function CaptureExtractedText({
  text,
  onTextChange,
  pending,
  errorMessage,
  engines,
  canSave,
  onSave,
}: {
  text: string;
  onTextChange: (text: string) => void;
  pending: boolean;
  /** The OCR failure message, or null when there is no error. */
  errorMessage: string | null;
  engines: string[];
  canSave: boolean;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!pending && !errorMessage && !text) return null;

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
        {pending && (
          <p className="text-sm text-muted-foreground">Extracting text…</p>
        )}

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        {text && (
          <>
            <Textarea
              value={text}
              onChange={e => onTextChange(e.target.value)}
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
                onClick={onSave}
                disabled={!canSave}
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
  );
}
