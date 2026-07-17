import type { Sentence } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Camera, ChevronDown, Database, Layers, PenLine, TriangleAlert, Volume2 } from "lucide-react";

import { speak } from "./ai-lesson/speak";
import { FuriganaEditor } from "./FuriganaEditor";
import { SentenceText } from "./SentenceText";
import { VocabHoverPill } from "./VocabHoverPill";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSentenceVocab } from "@/hooks/useSentences";
import { sentencesApi } from "@/lib/api";
import { groupTermsByCategory, TERM_CATEGORIES } from "@/lib/terms";

interface SentenceCardProps {
  sentence: Sentence;
  showTranslation?: boolean;
  /** Resolved taxonomy source name, when the sentence references one. */
  sourceName?: string | null;
  /** A sentence has no edit page, so (per the delete-only-on-edit-page convention) this is the one
   * listing that keeps a delete — callers guard it with a confirm to avoid accidental deletion. */
  onDelete?: (id: string) => void;
  /** When provided, grammar-tag badges become filter buttons (surfaces the grammar↔sentence link). */
  onGrammarTagClick?: (termId: string) => void;
}

export function SentenceCard({
  sentence, showTranslation = true, sourceName, onDelete, onGrammarTagClick,
}: SentenceCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const [editFuri, setEditFuri] = useState(false);
  // Lazily fetch the sentence's linked vocab only when the breakdown is opened.
  const {
    data: linkedVocab,
  } = useSentenceVocab(sentence.id, showBreak);

  const hasKanji = /[㐀-䶿一-鿿々]/.test(sentence.text);

  const tags = (sentence.tags ?? "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
  const termGroups = groupTermsByCategory(sentence.terms ?? []);

  // Prefer the resolved taxonomy source name; fall back to the legacy free-text `source` for old rows.
  const sourceId = sentence.sourceId;
  const displaySource = sourceId ? sourceName ?? null : sentence.source;
  const pageLabel = sentence.page ? `p. ${sentence.page}` : null;
  const hasMedia = sentence.hasAudio || sentence.hasImage;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 shrink-0"
                  aria-label="Hear"
                  onClick={() => speak(sentence.text)}
                >
                  <Volume2 className="size-4" />
                </Button>
                <p className="text-lg font-semibold">
                  <SentenceText
                    text={sentence.text}
                    reading={sentence.reading}
                  />
                </p>
              </div>
              {onDelete
                ? (
                  <button
                    type="button"
                    onClick={() => onDelete(sentence.id)}
                    className="
                      shrink-0 text-sm text-destructive
                      hover:underline
                    "
                  >
                    Delete
                  </button>
                )
                : null}
            </div>

            {sentence.translation
              ? (
                showTranslation
                  ? <p className="text-sm text-muted-foreground">{sentence.translation}</p>
                  : (
                    <button
                      type="button"
                      onClick={() => setRevealed(v => !v)}
                      className="
                        w-full rounded-md border bg-muted/40 px-3 py-2 text-left
                        text-sm
                        hover:bg-muted
                      "
                    >
                      {revealed ? sentence.translation : "Reveal translation"}
                    </button>
                  )
              )
              : null}

            <div
              className="
                flex flex-wrap items-center gap-2 text-xs text-muted-foreground
              "
            >
              <Badge variant="secondary">{sentence.language}</Badge>
              {sourceId && displaySource
                ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 px-2"
                  >
                    <Link
                      to="/sources/$id"
                      params={{
                        id: sourceId,
                      }}
                    >
                      <Database className="size-3" />
                      {displaySource}
                    </Link>
                  </Button>
                )
                : displaySource
                  ? <span>{displaySource}</span>
                  : null}
              {pageLabel ? <span>{pageLabel}</span> : null}
              {sentence.captureId
                ? (
                  <Link
                    to="/captures/$id"
                    params={{
                      id: sentence.captureId,
                    }}
                    className="
                      inline-flex items-center gap-1
                      hover:text-blue-700
                    "
                  >
                    <Camera className="size-3" />
                    Capture
                  </Link>
                )
                : null}
              {tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700"
                >
                  {tag}
                </span>
              ))}
              {TERM_CATEGORIES.map(({
                category, label,
              }) => {
                const terms = termGroups[category];
                if (terms.length === 0) return null;
                return (
                  <span
                    key={category}
                    className="inline-flex flex-wrap items-center gap-1"
                  >
                    <span className="text-xs text-muted-foreground">{label}:</span>
                    {terms.map(term =>
                      category === "grammar" && onGrammarTagClick
                        ? (
                          <button
                            key={`${term.sourceId}:${term.id}`}
                            type="button"
                            onClick={() => onGrammarTagClick(term.id)}
                            title={`Filter by ${term.name}`}
                          >
                            <Badge
                              variant="outline"
                              className="
                                cursor-pointer
                                hover:bg-muted
                              "
                            >
                              {term.name}
                            </Badge>
                          </button>
                        )
                        : (
                          <Badge
                            key={`${term.sourceId}:${term.id}`}
                            variant="outline"
                            title={term.sourceLabel ? `${term.sourceLabel} (${term.kind})` : undefined}
                          >
                            {term.name}
                          </Badge>
                        ))}
                  </span>
                );
              })}
            </div>

            {sentence.notes ? <p className="text-sm">{sentence.notes}</p> : null}

            <div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBreak(v => !v)}
                >
                  <Layers className="size-4" />
                  {showBreak ? "Hide breakdown" : "Break it down"}
                  <ChevronDown
                    className={`
                      size-4 transition-transform
                      ${showBreak ? "rotate-180" : ""}
                    `}
                  />
                </Button>
                {hasKanji
                  ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditFuri(v => !v)}
                    >
                      <PenLine className="size-4" />
                      {editFuri ? "Close furigana" : "Edit furigana"}
                    </Button>
                  )
                  : null}
                {sentence.readingError
                  ? (
                    <span
                      className="
                        inline-flex items-center gap-1 text-xs text-destructive
                      "
                      title={sentence.readingError}
                    >
                      <TriangleAlert className="size-3.5" />
                      Furigana failed
                    </span>
                  )
                  : null}
              </div>
              {showBreak
                ? (
                  <div className="mt-2 rounded-md border p-3">
                    {linkedVocab && linkedVocab.length > 0
                      ? (
                        <div className="flex flex-wrap gap-1.5">
                          {linkedVocab.map(v => (
                            <VocabHoverPill
                              key={v.id}
                              vocab={v}
                            />
                          ))}
                        </div>
                      )
                      : <p className="text-sm text-muted-foreground">No linked vocab.</p>}
                  </div>
                )
                : null}
              {editFuri
                ? (
                  <FuriganaEditor
                    sentence={sentence}
                    onClose={() => setEditFuri(false)}
                  />
                )
                : null}
            </div>
          </div>
          {hasMedia
            ? (
              <div className="flex shrink-0 flex-col items-center gap-2">
                {sentence.hasImage
                  ? (
                    <img
                      src={sentencesApi.imageUrl(sentence.id)}
                      alt=""
                      className="
                        max-h-28 max-w-40 rounded-sm border object-contain
                      "
                    />
                  )
                  : null}
                {sentence.hasAudio
                  ? (
                    <audio
                      controls
                      preload="none"
                      src={sentencesApi.audioUrl(sentence.id)}
                      className="h-8 w-40"
                    >
                      <track kind="captions" />
                    </audio>
                  )
                  : null}
              </div>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}
