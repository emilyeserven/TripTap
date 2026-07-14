import type { AiLessonRef } from "./AiLessonBadge";
import type { LinkedSentence } from "@/lib/grammar-links";
import type { GrammarItem } from "@sentence-bank/types";

import { useState } from "react";

import { Volume2 } from "lucide-react";

import { AiLessonBadge } from "./AiLessonBadge";
import { GrammarTagsEditor } from "./GrammarTagsEditor";
import { speak } from "./speak";

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useUpdateAiLessonGrammarTerms } from "@/hooks/useAiLessons";

/** One grammar pattern as an accordion item. Render inside an <Accordion>. */
export function GrammarItemRow({
  grammar: g, aiLesson, onTagClick, linkedSentences,
}: { grammar: GrammarItem;
  aiLesson?: AiLessonRef;
  onTagClick?: (termId: string) => void;
  linkedSentences?: LinkedSentence[]; }) {
  const updateTerms = useUpdateAiLessonGrammarTerms();
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const toggle = (i: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <AccordionItem value={g.id}>
      <AccordionTrigger>
        <span className="flex flex-1 flex-col items-start gap-0.5 text-left">
          <span className="text-base font-medium">{g.pat}</span>
          <span className="text-sm text-muted-foreground">{g.gloss}</span>
        </span>
        {aiLesson
          ? (
            <span className="mr-2">
              <AiLessonBadge {...aiLesson} />
            </span>
          )
          : null}
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        <p className="text-sm/relaxed">{g.note}</p>

        <GrammarTagsEditor
          value={g.grammarTerms}
          isPending={updateTerms.isPending}
          onTagClick={onTagClick}
          onSave={grammarTerms => updateTerms.mutate({
            id: g.id,
            grammarTerms,
          })}
        />

        <ul className="space-y-3">
          {g.ex.map((e, ei) => {
            const show = revealed.has(ei);
            return (
              <li
                key={ei}
                className="space-y-1 border-l-2 pl-3"
              >
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 shrink-0"
                    aria-label="Hear"
                    onClick={() => speak(e.jp)}
                  >
                    <Volume2 className="size-4" />
                  </Button>
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => toggle(ei)}
                  >
                    {e.jp}
                  </button>
                </div>
                <button
                  type="button"
                  className="pl-8 text-left text-sm text-muted-foreground"
                  onClick={() => toggle(ei)}
                >
                  {show ? e.en : "Tap to reveal translation"}
                </button>
              </li>
            );
          })}
        </ul>

        {linkedSentences && linkedSentences.length > 0
          ? (
            <div className="space-y-2 rounded-md border p-3">
              <h4
                className="
                  text-xs font-semibold tracking-wide text-muted-foreground
                  uppercase
                "
              >
                Sentences using this grammar (
                {linkedSentences.length}
                )
              </h4>
              <ul className="space-y-2">
                {linkedSentences.map(s => (
                  <li
                    key={s.id}
                    className="space-y-0.5 border-l-2 pl-3 text-sm"
                  >
                    <p>{s.text}</p>
                    {s.translation
                      ? <p className="text-muted-foreground">{s.translation}</p>
                      : null}
                    {s.aiLessonTitle
                      ? <p className="text-xs text-muted-foreground">{s.aiLessonTitle}</p>
                      : null}
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}
      </AccordionContent>
    </AccordionItem>
  );
}
