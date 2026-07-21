import type { AiLessonRef } from "./AiLessonBadge";
import type { LinkedSentence } from "@/lib/grammar-links";
import type { GrammarItem } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { ChevronRight, Volume2 } from "lucide-react";

import { AddToBasketButton } from "../AddToBasketButton";
import { AiLessonBadge } from "./AiLessonBadge";
import { GrammarTagsEditor } from "./GrammarTagsEditor";
import { speak } from "./speak";

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useUpdateAiLessonGrammarTerms } from "@/hooks/useAiLessons";

/** A link from this grammar item to a matching grammar note (existing, or a tag to start one from). */
export interface GrammarNoteLink {
  /** An existing grammar note to open. */
  noteId?: string;
  /** A grammar tag to start a new note for, when none exists yet. */
  createTag?: { id: string;
    name: string; };
}

/** One grammar pattern as an accordion item. Render inside an <Accordion>. */
export function GrammarItemRow({
  grammar: g, aiLesson, onTagClick, linkedSentences, noteLink,
}: { grammar: GrammarItem;
  aiLesson?: AiLessonRef;
  onTagClick?: (termId: string) => void;
  linkedSentences?: LinkedSentence[];
  noteLink?: GrammarNoteLink | null; }) {
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
      {/* Basket button sits beside the trigger (not inside it — nested buttons are invalid). */}
      <div className="flex items-center gap-1">
        <AccordionTrigger className="flex-1">
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
        <AddToBasketButton
          item={{
            kind: "grammar",
            id: g.id,
            pattern: g.pat,
            gloss: g.gloss,
            note: g.note,
            examples: g.ex,
          }}
        />
      </div>
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

        {noteLink?.noteId
          ? (
            <Link
              to="/grammar-notes/$id"
              params={{
                id: noteLink.noteId,
              }}
              className="
                inline-flex items-center gap-1 text-sm font-medium
                hover:underline
              "
            >
              Grammar note
              <ChevronRight className="size-4" />
            </Link>
          )
          : noteLink?.createTag
            ? (
              <Link
                to="/grammar-notes/new"
                search={{
                  tag: noteLink.createTag.id,
                  name: noteLink.createTag.name,
                }}
                className="
                  inline-flex items-center gap-1 text-sm text-muted-foreground
                  hover:underline
                "
              >
                ＋ Grammar note
              </Link>
            )
            : null}

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
