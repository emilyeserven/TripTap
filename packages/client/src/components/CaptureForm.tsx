import type { OcrBlock } from "@sentence-bank/types";

import { useState } from "react";

import { SourcePicker } from "./SourcePicker";
import { useCreateCapture } from "../hooks/useCaptures";

const fieldClass
  = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none";

/**
 * Save-capture form. Persists the OCR result (text + per-block detail) plus its image and metadata
 * as a first-class `capture`. Parsing a capture into sentences is a separate, later step.
 */
export function CaptureForm({
  text,
  blocks,
  engines,
  image,
  onSaved,
}: {
  text: string;
  blocks: OcrBlock[];
  engines: string[];
  /** The exact image that was OCR'd (cropped blob or original), stored with the capture. */
  image: Blob | null;
  onSaved: (id: string) => void;
}) {
  const createCapture = useCreateCapture();
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [page, setPage] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const capture = await createCapture.mutateAsync({
      input: {
        title: title.trim() || null,
        text,
        blocks,
        engines,
        sourceId,
        page: page.trim() || null,
        notes: notes.trim() || null,
      },
      image,
    });
    onSaved(capture.id);
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <label className="block text-sm font-medium text-foreground">
        Title (optional)
        <input
          className={fieldClass}
          placeholder="e.g. Yotsuba vol.1, p.12"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </label>

      <SourcePicker
        value={sourceId}
        onChange={setSourceId}
      />

      <label className="block text-sm font-medium text-foreground">
        Page / location
        <input
          className={fieldClass}
          value={page}
          onChange={e => setPage(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-foreground">
        Notes
        <textarea
          className={fieldClass}
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={createCapture.isPending || !text.trim()}
        className="
          justify-self-start rounded-md bg-primary px-4 py-2 text-sm font-medium
          text-primary-foreground
          hover:bg-primary/90
          disabled:opacity-50
        "
      >
        {createCapture.isPending ? "Saving…" : "Save capture"}
      </button>
      {createCapture.isError
        ? <p className="text-sm text-destructive">{createCapture.error?.message}</p>
        : null}
    </form>
  );
}
