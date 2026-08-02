import { useState } from "react";

import { SourcePicker } from "./SourcePicker";
import { useCreateCapture } from "../hooks/useCaptures";

const fieldClass
  = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none";

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
      <label className="block text-sm font-medium text-foreground">
        Text
        <textarea
          className={fieldClass}
          rows={8}
          placeholder="Paste the recognized text…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-foreground">
        Title (optional)
        <input
          className={fieldClass}
          placeholder="e.g. Yotsuba vol.1, p.12"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-foreground">
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

      <label className="block text-sm font-medium text-foreground">
        Image (optional)
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm text-muted-foreground"
          onChange={e => setImage(e.target.files?.[0] ?? null)}
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
