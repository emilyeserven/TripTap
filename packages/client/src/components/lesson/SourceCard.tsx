import type { LessonRef } from "./LessonBadge";
import type { SourceSentenceItem } from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown, ExternalLink, Layers, ScrollText, Volume2 } from "lucide-react";

import { Furi } from "./Furi";
import { GrammarTagsEditor } from "./GrammarTagsEditor";
import { LessonBadge } from "./LessonBadge";
import { LevelBadge } from "./LevelBadge";
import { speak } from "./speak";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useUpdateSourceSentenceTerms } from "@/hooks/useLessons";

/** A single source sentence with reveal + grammar/vocab breakdown. */
export function SourceCard({
  sentence: s, lesson, onTagClick,
}: { sentence: SourceSentenceItem;
  lesson?: LessonRef;
  onTagClick?: (termId: string) => void; }) {
  const updateTerms = useUpdateSourceSentenceTerms();
  const [showEn, setShowEn] = useState(false);
  const [showBreak, setShowBreak] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div
          className="
            flex items-center justify-between gap-2 text-sm
            text-muted-foreground
          "
        >
          <span className="flex items-center gap-1.5">
            <ScrollText className="size-3.5" />
            {s.where}
          </span>
          <div className="flex items-center gap-2">
            {lesson ? <LessonBadge {...lesson} /> : null}
            {s.url && (
              <a
                className="
                  flex items-center gap-1
                  hover:underline
                "
                href={s.url}
                target="_blank"
                rel="noreferrer"
              >
                source
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            aria-label="Hear"
            onClick={() => speak(s.jp)}
          >
            <Volume2 className="size-4" />
          </Button>
          <p className="text-lg">{s.jp}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowEn(v => !v)}
          className="
            w-full rounded-md border bg-muted/40 px-3 py-2 text-left text-sm
            hover:bg-muted
          "
        >
          {showEn ? s.en : "Reveal translation"}
        </button>

        <GrammarTagsEditor
          value={s.grammarTerms}
          isPending={updateTerms.isPending}
          onTagClick={onTagClick}
          onSave={grammarTerms => updateTerms.mutate({
            id: s.id,
            grammarTerms,
          })}
        />

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
              ${showBreak
      ? "rotate-180"
      : ""}
            `}
          />
        </Button>

        {showBreak && (
          <div className="space-y-4 rounded-md border p-3">
            {s.grammar.length > 0 && (
              <div className="space-y-2">
                <h4
                  className="
                    text-xs font-semibold tracking-wide text-muted-foreground
                    uppercase
                  "
                >Grammar
                </h4>
                <ul className="space-y-2">
                  {s.grammar.map((g, gi) => (
                    <li
                      key={gi}
                      className="text-sm"
                    >
                      <span className="font-medium">{g.p}</span>
                      {" — "}
                      <span className="text-muted-foreground">{g.d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.vocab.length > 0 && (
              <div className="space-y-2">
                <h4
                  className="
                    text-xs font-semibold tracking-wide text-muted-foreground
                    uppercase
                  "
                >Vocabulary
                </h4>
                <ul className="space-y-1.5">
                  {s.vocab.map((v, vi) => (
                    <li
                      key={vi}
                      className="flex flex-wrap items-center gap-x-2 text-sm"
                    >
                      <span className="font-medium">
                        <Furi
                          kanji={v.w}
                          yomi={v.y}
                        />
                      </span>
                      <span>{v.m}</span>
                      <LevelBadge lvl={v.lvl} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
