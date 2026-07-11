import { useState } from "react";

import { useCreateSource, useSources } from "../hooks/useSources";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

const NEW = "__new";

/**
 * Chooses the taxonomy source a sentence belongs to. Users either pick an existing source or switch
 * to a small inline form to create one; on create it is selected immediately. `value` is the selected
 * `source_id` (or null for "no source").
 */
export function SourcePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (sourceId: string | null) => void;
}) {
  const {
    data: sources,
  } = useSources();
  const createSource = useCreateSource();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");

  async function saveNew() {
    if (!name.trim()) return;
    const created = await createSource.mutateAsync({
      name: name.trim(),
      type: type.trim() || null,
      author: author.trim() || null,
      url: url.trim() || null,
    });
    onChange(created.id);
    setName("");
    setType("");
    setAuthor("");
    setUrl("");
    setCreating(false);
  }

  if (creating) {
    return (
      <div className="space-y-2 rounded-md border border-slate-200 p-3">
        <p className="text-sm font-medium text-slate-700">New source</p>
        <input
          className={fieldClass}
          placeholder="Name (e.g. よつばと！ vol. 1)"
          aria-label="Source name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div
          className="
            grid gap-2
            sm:grid-cols-2
          "
        >
          <input
            className={fieldClass}
            placeholder="Type (book, show, …)"
            aria-label="Source type"
            value={type}
            onChange={e => setType(e.target.value)}
          />
          <input
            className={fieldClass}
            placeholder="Author"
            aria-label="Source author"
            value={author}
            onChange={e => setAuthor(e.target.value)}
          />
        </div>
        <input
          className={fieldClass}
          placeholder="URL"
          aria-label="Source URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!name.trim() || createSource.isPending}
            onClick={() => void saveNew()}
            className="
              rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white
              hover:bg-blue-700
              disabled:opacity-50
            "
          >
            {createSource.isPending ? "Saving…" : "Save source"}
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="
              text-sm text-slate-600
              hover:underline
            "
          >
            Cancel
          </button>
        </div>
        {createSource.isError
          ? <p className="text-xs text-red-600">{createSource.error?.message}</p>
          : null}
      </div>
    );
  }

  return (
    <label className="block text-sm font-medium text-slate-700">
      Source
      <select
        className={fieldClass}
        aria-label="Source"
        value={value ?? ""}
        onChange={(e) => {
          if (e.target.value === NEW) {
            setCreating(true);
            return;
          }
          onChange(e.target.value || null);
        }}
      >
        <option value="">No source</option>
        {(sources ?? []).map(s => (
          <option
            key={s.id}
            value={s.id}
          >
            {s.name}
          </option>
        ))}
        <option value={NEW}>+ New source…</option>
      </select>
    </label>
  );
}
