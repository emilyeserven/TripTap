import type { PracticeGrammar, PracticeWord } from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The collapsible words/grammar breakdown of a practice sentence card. Renders nothing when the
 * sentence has no logged words or grammar points.
 */
export function PracticeSentenceBreakdown({
  words,
  grammar,
}: {
  words: PracticeWord[];
  grammar: PracticeGrammar[];
}) {
  const [showBreak, setShowBreak] = useState(false);

  if (words.length === 0 && grammar.length === 0) return null;
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowBreak(v => !v)}
      >
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
      {showBreak
        ? (
          <div className="mt-2 space-y-3 rounded-md border p-3 text-sm">
            {words.length > 0
              ? (
                <div>
                  <p
                    className="
                      mb-1 text-xs font-medium text-muted-foreground uppercase
                    "
                  >Words
                  </p>
                  <ul className="space-y-0.5">
                    {words.map((w, i) => (
                      <li key={i}>
                        <span className="font-medium">{w.w}</span>
                        {w.r ? <span className="text-muted-foreground">{` (${w.r})`}</span> : null}
                        {w.m ? ` — ${w.m}` : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )
              : null}
            {grammar.length > 0
              ? (
                <div>
                  <p
                    className="
                      mb-1 text-xs font-medium text-muted-foreground uppercase
                    "
                  >Grammar
                  </p>
                  <ul className="space-y-0.5">
                    {grammar.map((g, i) => (
                      <li key={i}>
                        <span className="font-medium">{g.p}</span>
                        {g.n ? ` — ${g.n}` : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )
              : null}
          </div>
        )
        : null}
    </div>
  );
}
