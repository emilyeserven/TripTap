import type { Sentence } from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown, Layers, PenLine, TriangleAlert } from "lucide-react";

import { FuriganaEditor } from "./FuriganaEditor";
import { VocabHoverPill } from "./VocabHoverPill";

import { Button } from "@/components/ui/button";
import { useSentenceVocab } from "@/hooks/useSentences";

/**
 * The tool strip under a sentence: the lazy linked-vocab breakdown toggle, the furigana editor
 * toggle (kanji sentences only), and the furigana-failure warning.
 */
export function SentenceCardTools({
  sentence,
}: {
  sentence: Sentence;
}) {
  const [showBreak, setShowBreak] = useState(false);
  const [editFuri, setEditFuri] = useState(false);
  // Lazily fetch the sentence's linked vocab only when the breakdown is opened.
  const {
    data: linkedVocab,
  } = useSentenceVocab(sentence.id, showBreak);

  const hasKanji = /[㐀-䶿一-鿿々]/.test(sentence.text);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {sentence.vocabCount > 0
          ? (
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
          )
          : null}
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
  );
}
