import type { QuestionSheetImport } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { buildQuestionSheetImportPrompt, parseQuestionSheetImport } from "@/lib/question-sheet-import";

/**
 * "Fill from photos": copy a prompt, run it in an AI chat with photos/screenshots of the exercise
 * attached, then paste the JSON it returns to add those questions to the form. Nothing is saved until
 * the learner submits the form, so the import can be reviewed and corrected first.
 */
export function QuestionSheetImportCard({
  resource,
  page,
  onImport,
}: {
  /** The picked resource's title, woven into the prompt so the AI titles the sheet consistently. */
  resource: string | null;
  page: string;
  onImport: (data: QuestionSheetImport) => void;
}) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [json, setJson] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [added, setAdded] = useState<string | null>(null);
  const {
    copied, copy,
  } = useCopyToClipboard({
    resetAfterMs: 1500,
  });

  const prompt = buildQuestionSheetImportPrompt({
    resource,
    page,
  });

  function apply() {
    setAdded(null);
    const result = parseQuestionSheetImport(json);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onImport(result.data);
    const count = result.data.questions?.length ?? result.data.grid?.rows.length ?? 0;
    setAdded(`Added ${count} ${count === 1 ? "item" : "items"} — check them below, then save.`);
    setJson("");
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Fill from photos</p>
        <p className="text-xs text-muted-foreground">
          Copy the prompt, paste it into Claude (or another AI chat) with photos or screenshots of the
          exercise attached, then paste the JSON it replies with below. The questions are added to this
          form so you can check them before saving.
        </p>
      </div>
      <Textarea
        ref={promptRef}
        readOnly
        value={prompt}
        rows={4}
        className="font-mono text-xs"
        aria-label="AI prompt for filling a question sheet from photos"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => void copy(prompt, promptRef.current)}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy prompt"}
      </Button>
      <div className="space-y-1.5">
        <Label htmlFor="qs-import-json">AI reply (JSON)</Label>
        <Textarea
          id="qs-import-json"
          value={json}
          onChange={e => setJson(e.target.value)}
          rows={5}
          placeholder={"{ \"title\": \"…\", \"questions\": [ … ] }"}
          className="font-mono text-xs"
        />
      </div>
      {errors.length > 0 && (
        <ul className="space-y-1 text-sm text-destructive">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {added ? <p className="text-sm text-muted-foreground">{added}</p> : null}
      <Button
        type="button"
        variant="secondary"
        disabled={!json.trim()}
        onClick={apply}
      >
        Add to sheet
      </Button>
    </div>
  );
}
