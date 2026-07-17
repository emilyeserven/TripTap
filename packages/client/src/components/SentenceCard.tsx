import type { Sentence } from "@sentence-bank/types";

import { Volume2 } from "lucide-react";

import { speak } from "./ai-lesson/speak";
import { SentenceCardMedia } from "./SentenceCardMedia";
import { SentenceCardMeta } from "./SentenceCardMeta";
import { SentenceCardTools } from "./SentenceCardTools";
import { SentenceText } from "./SentenceText";
import { SentenceTranslationReveal } from "./SentenceTranslationReveal";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

            <SentenceTranslationReveal
              translation={sentence.translation}
              showTranslation={showTranslation}
            />

            <SentenceCardMeta
              sentence={sentence}
              sourceName={sourceName}
              onGrammarTagClick={onGrammarTagClick}
            />

            {sentence.notes ? <p className="text-sm">{sentence.notes}</p> : null}

            <SentenceCardTools sentence={sentence} />
          </div>
          <SentenceCardMedia sentence={sentence} />
        </div>
      </CardContent>
    </Card>
  );
}
