import { useState } from "react";

import { SourcePicker } from "./SourcePicker";
import { useCreateVocab } from "../hooks/useVocab";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

/** Create-vocab form. Owns its own mutation, mirroring {@link SentenceForm}'s plain-input style. */
export function VocabForm({
  onSuccess,
}: { onSuccess?: () => void }) {
  const createVocab = useCreateVocab();
  const [term, setTerm] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [language, setLanguage] = useState("Japanese");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [page, setPage] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!term.trim() || !language.trim()) return;
    await createVocab.mutateAsync({
      term: term.trim(),
      reading: reading.trim() || null,
      meaning: meaning.trim() || null,
      language: language.trim(),
      sourceId,
      page: page.trim() || null,
      tags: tags.trim() || null,
      notes: notes.trim() || null,
    });
    setTerm("");
    setReading("");
    setMeaning("");
    setSourceId(null);
    setPage("");
    setTags("");
    setNotes("");
    onSuccess?.();
  }

  return (
    <form
      className="
        grid gap-4
        sm:grid-cols-2
      "
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <label className="block text-sm font-medium text-slate-700">
        Term
        <input
          className={fieldClass}
          value={term}
          onChange={e => setTerm(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Reading
        <input
          className={fieldClass}
          value={reading}
          onChange={e => setReading(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Meaning
        <input
          className={fieldClass}
          value={meaning}
          onChange={e => setMeaning(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Language
        <input
          className={fieldClass}
          value={language}
          onChange={e => setLanguage(e.target.value)}
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
        Tags (comma-separated)
        <input
          className={fieldClass}
          value={tags}
          onChange={e => setTags(e.target.value)}
        />
      </label>
      <label
        className="
          block text-sm font-medium text-slate-700
          sm:col-span-2
        "
      >
        Notes
        <textarea
          className={fieldClass}
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={createVocab.isPending || !term.trim() || !language.trim()}
          className="
            rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white
            hover:bg-blue-700
            disabled:opacity-50
          "
        >
          {createVocab.isPending ? "Saving…" : "Add vocab"}
        </button>
        {createVocab.isError
          ? <p className="mt-2 text-sm text-red-600">{createVocab.error?.message}</p>
          : null}
      </div>
    </form>
  );
}
