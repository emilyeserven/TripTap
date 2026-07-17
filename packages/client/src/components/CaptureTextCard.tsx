import type { Capture } from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdateCapture } from "@/hooks/useCaptures";

/**
 * Left box of the capture detail page's Text Mode. Edits a persisted, tidied-up copy of the OCR text
 * (`cleanedText`, seeded from the raw `text` when unset) and keeps the pristine source text
 * viewable behind a collapsible toggle.
 */
export function CaptureTextCard({
  capture,
}: { capture: Capture }) {
  const [cleaned, setCleaned] = useState(capture.cleanedText ?? capture.text);
  const [saved, setSaved] = useState(false);
  const updateCapture = useUpdateCapture();

  const dirty = cleaned !== (capture.cleanedText ?? capture.text);

  async function save() {
    setSaved(false);
    await updateCapture.mutateAsync({
      id: capture.id,
      // An empty box clears the cleaned copy (falls back to the source text everywhere).
      input: {
        cleanedText: cleaned.trim() ? cleaned : null,
      },
    });
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cleaned text</CardTitle>
        <CardDescription>
          An editable, tidied-up copy of the text. The original OCR output is preserved below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="
            max-h-[70vh] w-full rounded-md border border-input bg-transparent
            px-3 py-2 font-sans text-sm whitespace-pre-wrap
            focus:border-blue-500 focus:outline-none
          "
          rows={16}
          value={cleaned}
          onChange={(e) => {
            setCleaned(e.target.value);
            setSaved(false);
          }}
          aria-label="Cleaned text"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={updateCapture.isPending || !dirty}
          >
            {updateCapture.isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCleaned(capture.text);
              setSaved(false);
            }}
          >
            Reset to source
          </Button>
          {saved && !dirty ? <span className="text-sm text-green-700">Saved.</span> : null}
          {updateCapture.isError ? <span className="text-sm text-destructive">Could not save.</span> : null}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Show original source text</summary>
          <pre
            className="
              mt-2 max-h-[50vh] overflow-auto font-sans text-sm
              whitespace-pre-wrap text-foreground
            "
          >
            {capture.text}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
