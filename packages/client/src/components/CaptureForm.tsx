import type { OcrBlock } from "@sentence-bank/types";

import { useState } from "react";

import { SourcePicker } from "./SourcePicker";
import { useCreateCapture } from "../hooks/useCaptures";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

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
      <label className="block text-sm font-medium text-slate-700">
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

      <label className="block text-sm font-medium text-slate-700">
        Page / location
        <input
          className={fieldClass}
          value={page}
          onChange={e => setPage(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
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
          justify-self-start rounded-md bg-blue-600 px-4 py-2 text-sm
          font-medium text-white
          hover:bg-blue-700
          disabled:opacity-50
        "
      >
        {createCapture.isPending ? "Saving…" : "Save capture"}
      </button>
      {createCapture.isError
        ? <p className="text-sm text-red-600">{createCapture.error?.message}</p>
        : null}
    </form>
  );
}
