import { SourcePicker } from "@/components/SourcePicker";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

/**
 * The "shared values" grid used by both capture workbenches (parse + cleaned blocks): source, page,
 * language, tags, and notes applied to every item mined from the capture. The parent owns the state.
 */
export function SharedCaptureFields({
  sourceId,
  page,
  language,
  tags,
  notes,
  languageLabel,
  onSourceIdChange,
  onPageChange,
  onLanguageChange,
  onTagsChange,
  onNotesChange,
}: {
  sourceId: string | null;
  page: string;
  language: string;
  tags: string;
  notes: string;
  /** "Language (shared)" for the parse workspace, "Language fallback (shared)" for cleaned blocks. */
  languageLabel: string;
  onSourceIdChange: (value: string | null) => void;
  onPageChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      <SourcePicker
        value={sourceId}
        onChange={onSourceIdChange}
      />
      <label className="block text-sm font-medium text-slate-700">
        Page / location (shared)
        <input
          className={fieldClass}
          value={page}
          onChange={e => onPageChange(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {languageLabel}
        <input
          className={fieldClass}
          value={language}
          onChange={e => onLanguageChange(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Tags (shared)
        <input
          className={fieldClass}
          value={tags}
          onChange={e => onTagsChange(e.target.value)}
        />
      </label>
      <label
        className="
          block text-sm font-medium text-slate-700
          sm:col-span-2
        "
      >
        Notes (shared)
        <input
          className={fieldClass}
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
        />
      </label>
    </div>
  );
}
