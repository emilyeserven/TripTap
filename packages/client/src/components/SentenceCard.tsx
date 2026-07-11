import type { Sentence } from "@sentence-bank/types";

interface SentenceCardProps {
  sentence: Sentence;
  showTranslation?: boolean;
  /** Resolved taxonomy source name, when the sentence references one. */
  sourceName?: string | null;
  onDelete?: (id: string) => void;
}

export function SentenceCard({
  sentence, showTranslation = true, sourceName, onDelete,
}: SentenceCardProps) {
  const tags = (sentence.tags ?? "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);

  // Prefer the resolved taxonomy source name; fall back to the legacy free-text `source` for old rows.
  const displaySource = sentence.sourceId ? sourceName ?? null : sentence.source;
  const sourceLabel = [displaySource, sentence.page ? `p. ${sentence.page}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{sentence.text}</p>
          {showTranslation && sentence.translation
            ? <p className="mt-1 text-sm text-slate-600">{sentence.translation}</p>
            : null}
        </div>
        {onDelete
          ? (
            <button
              type="button"
              onClick={() => onDelete(sentence.id)}
              className="
                text-sm text-red-600
                hover:underline
              "
            >
              Delete
            </button>
          )
          : null}
      </div>
      <div
        className="
          mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500
        "
      >
        <span
          className="
            rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600
          "
        >
          {sentence.language}
        </span>
        {sourceLabel ? <span>{sourceLabel}</span> : null}
        {tags.map(tag => (
          <span
            key={tag}
            className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700"
          >
            {tag}
          </span>
        ))}
      </div>
      {sentence.notes ? <p className="mt-2 text-sm text-slate-700">{sentence.notes}</p> : null}
    </article>
  );
}
