import type { LessonRef } from "./LessonBadge";
import type { GrammarItem } from "@sentence-bank/types";

import { useState } from "react";

import { Volume2 } from "lucide-react";

import { LessonBadge } from "./LessonBadge";
import { speak } from "./speak";

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

/** One grammar pattern as an accordion item. Render inside an <Accordion>. */
export function GrammarItemRow({
  grammar: g, lesson,
}: { grammar: GrammarItem;
  lesson?: LessonRef; }) {
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
        {lesson
          ? (
            <span className="mr-2">
              <LessonBadge {...lesson} />
            </span>
          )
          : null}
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        <p className="text-sm/relaxed">{g.note}</p>
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
      </AccordionContent>
    </AccordionItem>
  );
}
