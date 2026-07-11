import { useMemo, useState } from "react";

import { useVocab } from "../hooks/useVocab";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

/**
 * Multi-select for linking existing vocab to a sentence. Compact toggle chips with a filter; the
 * value is the selected vocab ids.
 */
export function VocabLinkPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const {
    data: vocab,
  } = useVocab();
  const [filter, setFilter] = useState("");

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = vocab ?? [];
    if (!q) return list;
    return list.filter(v =>
      v.term.toLowerCase().includes(q)
      || (v.meaning ?? "").toLowerCase().includes(q)
      || (v.reading ?? "").toLowerCase().includes(q));
  }, [vocab, filter]);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">
        Linked vocab
        {value.length > 0 ? ` (${value.length})` : ""}
      </span>
      {(vocab ?? []).length === 0
        ? <p className="mt-1 text-xs text-slate-500">No vocab yet — create some to link.</p>
        : (
          <>
            <input
              className={fieldClass}
              placeholder="Filter vocab…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <div
              className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto"
            >
              {shown.map((v) => {
                const on = value.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggle(v.id)}
                    className={`
                      rounded-full border px-2 py-0.5 text-xs
                      ${
                  on
                    ? "border-blue-600 bg-blue-600 text-white"
                    : `
                      border-slate-300 text-slate-700
                      hover:border-blue-400
                    `
                  }
                    `}
                    title={v.meaning ?? undefined}
                  >
                    {v.term}
                  </button>
                );
              })}
            </div>
          </>
        )}
    </div>
  );
}
