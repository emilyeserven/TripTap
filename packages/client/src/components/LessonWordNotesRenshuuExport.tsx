import type { LessonWordNote } from "@sentence-bank/types";

import { useRef } from "react";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { toRenshuuVocabText } from "@/lib/renshuu";

/**
 * A "Copy for Renshuu" popover for a lesson's word notes, shown in the Word notes section header. Only
 * flashcard-marked notes are exported — mapped to Renshuu's bulk vocab format (one `term/reading` per
 * line via {@link toRenshuuVocabText}, which drops notes with no term). Renders nothing when there is
 * nothing to export, so the caller can gate the section action on the same condition.
 */
export function LessonWordNotesRenshuuExport({
  wordNotes,
}: {
  wordNotes: LessonWordNote[];
}) {
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const {
    copied, copy,
  } = useCopyToClipboard();

  const output = toRenshuuVocabText(
    wordNotes
      .filter(w => w.flashcard)
      .map(w => ({
        term: w.word ?? "",
        reading: w.reading,
      })),
  );

  if (!output) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
        >
          <Copy className="size-4" />
          Copy for Renshuu
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 space-y-2"
      >
        <p className="text-xs text-muted-foreground">
          Flashcard word notes, one term/reading per line. Paste into Renshuu&apos;s bulk vocab import.
        </p>
        <Textarea
          ref={outputRef}
          readOnly
          value={output}
          rows={8}
          className="font-mono text-xs"
          aria-label="Renshuu vocab export text"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void copy(output, outputRef.current)}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
