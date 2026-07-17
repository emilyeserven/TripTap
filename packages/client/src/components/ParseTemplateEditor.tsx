import type { ParseTarget } from "@sentence-bank/types";

import { useRef } from "react";

import { FIELD_CLASS, TAGS } from "@/lib/captureParseUi";

/**
 * Editable `{{tag}}` template with clickable tag chips for one parse target. Owns its textarea ref
 * so a clicked chip inserts at (and restores) the caret; the template value itself is parent state.
 */
export function ParseTemplateEditor({
  target,
  label,
  value,
  onChange,
}: {
  target: ParseTarget;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertTag(tag: string) {
    const el = textareaRef.current;
    const token = `{{${tag}}}`;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    onChange(value.slice(0, start) + token + value.slice(end));
    // Restore focus after React re-renders.
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="my-1 flex flex-wrap gap-1">
        {TAGS[target].map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => insertTag(tag)}
            className="
              rounded-sm border border-slate-300 px-1.5 py-0.5 font-mono text-xs
              text-slate-600
              hover:border-blue-400
            "
          >
            {`{{${tag}}}`}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className={`
          ${FIELD_CLASS}
          mt-0 font-mono
        `}
        rows={2}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
