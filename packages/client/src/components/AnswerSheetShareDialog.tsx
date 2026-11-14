import type { AnswerSheet, QuestionSheet } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { Check, Copy, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { formatAnswerSheetForTeacher } from "@/lib/answer-sheet-share";

/**
 * "Copy for teacher": previews the answer sheet as tidy plain text (question numbers, part labels, the
 * questions themselves, and each answer on its own line) and copies it, ready to paste into a message.
 * The preview textarea doubles as the copy fallback on plain-HTTP origins without the Clipboard API.
 */
export function AnswerSheetShareDialog({
  questionSheet,
  answerSheet,
}: {
  questionSheet: QuestionSheet;
  answerSheet: AnswerSheet;
}) {
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [includeUnanswered, setIncludeUnanswered] = useState(false);
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const {
    copied, copy,
  } = useCopyToClipboard({
    resetAfterMs: 1500,
  });

  const text = formatAnswerSheetForTeacher(questionSheet, answerSheet, {
    includeQuestions,
    includeUnanswered,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
        >
          <Send className="size-4" />
          Copy for teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copy answers for your teacher</DialogTitle>
          <DialogDescription>
            Plain text that pastes cleanly into a chat or email. Check it over, then copy.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={includeQuestions}
              onCheckedChange={v => setIncludeQuestions(v === true)}
            />
            Include the questions
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={includeUnanswered}
              onCheckedChange={v => setIncludeUnanswered(v === true)}
            />
            Include unanswered
          </label>
        </div>
        <Textarea
          ref={previewRef}
          readOnly
          value={text}
          rows={14}
          className="font-mono text-sm"
          aria-label="Answers formatted for your teacher"
        />
        <div>
          <Button onClick={() => void copy(text, previewRef.current)}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
