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
  /** Editing happens in a dialog on the list page; when provided, an "Edit" button opens it. */
  onEdit?: (sentence: Sentence) => void;
  /** This listing keeps a delete (guarded by a confirm) — callers pass it to allow removal. */
  onDelete?: (id: string) => void;
  /** When provided, grammar-tag badges become filter buttons (surfaces the grammar↔sentence link). */
  onGrammarTagClick?: (termId: string) => void;
}

export function SentenceCard({
  sentence, showTranslation = true, sourceName, onEdit, onDelete, onGrammarTagClick,
}: SentenceCardProps) {
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
              {onEdit || (onDelete && !hasMedia)
                ? (
                  <div className="flex shrink-0 items-center gap-3">
                    {onEdit
                      ? (
                        <button
                          type="button"
                          onClick={() => onEdit(sentence)}
                          className="
                            text-sm text-muted-foreground
                            hover:underline
                          "
                        >
                          Edit
                        </button>
                      )
                      : null}
                    {onDelete && !hasMedia
                      ? (
                        <button
                          type="button"
                          onClick={() => onDelete(sentence.id)}
                          className="
                            text-sm text-destructive
                            hover:underline
                          "
                        >
                          Delete
                        </button>
                      )
                      : null}
                  </div>
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
          {onDelete && hasMedia
            ? (
              <div className="relative shrink-0">
                <SentenceCardMedia sentence={sentence} />
                <button
                  type="button"
                  onClick={() => onDelete(sentence.id)}
                  className="
                    absolute top-1 right-1 rounded-sm bg-background/80 px-1.5
                    py-0.5 text-xs text-destructive backdrop-blur-sm
                    hover:underline
                  "
                >
                  Delete
                </button>
              </div>
            )
            : <SentenceCardMedia sentence={sentence} />}
        </div>
      </CardContent>
    </Card>
  );
}
