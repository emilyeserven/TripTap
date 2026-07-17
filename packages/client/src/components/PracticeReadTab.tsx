import type { PracticeDraft, SetPracticeDraft } from "@/lib/practiceEditor";
import type { PracticeSentence } from "@sentence-bank/types";
import type { ReactNode } from "react";

import { Volume2 } from "lucide-react";

import { speak } from "./ai-lesson/speak";
import { PracticeField } from "./PracticeField";
import { PracticeReadAloudVocab } from "./PracticeReadAloudVocab";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMPREHENSION_OPTIONS, speakSlow } from "@/lib/practiceEditor";

/** Step 1 — Read Aloud: hear/shadow the sentence, fix its text/reading, gate comprehension. */
export function PracticeReadTab({
  draft,
  set,
  practiceSentence,
  footer,
}: {
  draft: PracticeDraft;
  set: SetPracticeDraft;
  practiceSentence: PracticeSentence;
  footer: ReactNode;
}) {
  return (
    <>
      <div className="flex items-start gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          aria-label="Hear it"
          onClick={() => speak(draft.text)}
        >
          <Volume2 className="size-5" />
        </Button>
        <p className="text-2xl font-semibold">{draft.text || "—"}</p>
      </div>
      <div
        className="
          flex flex-wrap items-center gap-2 text-xs text-muted-foreground
        "
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => speakSlow(draft.text)}
        >
          <Volume2 className="size-3.5" />
          Play slowly
        </Button>
        Shadow it — say it back, matching the pitch accent and rhythm.
      </div>
      <PracticeField
        label="The sentence"
        hint="copy it exactly; trim it if it's long"
      >
        <Textarea
          value={draft.text}
          onChange={e => set("text", e.target.value)}
          rows={2}
        />
      </PracticeField>
      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <PracticeField
          label="Reading"
          hint="only the parts you weren't sure of"
        >
          <Input
            value={draft.reading}
            onChange={e => set("reading", e.target.value)}
            placeholder="あたまがいたい"
          />
        </PracticeField>
        <PracticeField label="Language">
          <Input
            value={draft.language}
            onChange={e => set("language", e.target.value)}
            placeholder="Japanese"
          />
        </PracticeField>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <Label className="text-sm">How much do you understand?</Label>
          <span className="text-xs text-muted-foreground/80">
            card it now, study the parts first, or skip
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMPREHENSION_OPTIONS.map(o => (
            <Button
              key={o.value}
              type="button"
              size="sm"
              variant={draft.comprehension === o.value ? "default" : "outline"}
              onClick={() =>
                set("comprehension", draft.comprehension === o.value ? null : o.value)}
            >
              {o.label}
              <span className="ml-1 text-xs opacity-70">{o.hint}</span>
            </Button>
          ))}
        </div>
      </div>
      <PracticeReadAloudVocab practiceSentence={practiceSentence} />
      {footer}
    </>
  );
}
