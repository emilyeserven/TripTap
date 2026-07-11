import { useState } from "react";

import { SourcePicker } from "./SourcePicker";
import { useCreateCapture } from "../hooks/useCaptures";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

/**
 * Manual capture entry — for text OCR'd elsewhere (another app/service) and pasted in. Unlike the
 * scan flow there are no per-block results, so `blocks` is empty; `engines` records where the text
 * came from (defaults to "manual"). An image is optional.
 */
export function ManualCaptureForm({
  onSaved,
}: {
  onSaved: (id: string) => void;
}) {
  const createCapture = useCreateCapture();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [recognizedBy, setRecognizedBy] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [page, setPage] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<File | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const engine = recognizedBy.trim() || "manual";
    const capture = await createCapture.mutateAsync({
      input: {
        title: title.trim() || null,
        text,
        blocks: [],
        engines: [engine],
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
        Text
        <textarea
          className={fieldClass}
          rows={8}
          placeholder="Paste the recognized text…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Title (optional)
        <input
          className={fieldClass}
          placeholder="e.g. Yotsuba vol.1, p.12"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Recognized by (optional)
        <input
          className={fieldClass}
          placeholder="manual"
          value={recognizedBy}
          onChange={e => setRecognizedBy(e.target.value)}
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

      <label className="block text-sm font-medium text-slate-700">
        Image (optional)
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm text-slate-600"
          onChange={e => setImage(e.target.files?.[0] ?? null)}
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
