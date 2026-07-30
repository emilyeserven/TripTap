import { useState } from "react";

import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Builds a copyable prompt that activates the sentence-bank-breakdown skill for one sentence. */
export function PracticeBreakdownPromptGenerator() {
  const [sentence, setSentence] = useState("");
  const [copied, setCopied] = useState(false);

  const target = sentence.trim() || "<paste the Japanese sentence>";
  const prompt
    = "Use the sentence-bank-breakdown skill. Break this sentence down and output only the JSON:\n\n"
      + `${target}\n\n`
      + "If I've attached a screenshot, use it for context (who's speaking, the situation).";

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1500);
    }
    catch {
      // Clipboard may be unavailable; the textarea is selectable as a fallback.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate a breakdown prompt</CardTitle>
        <CardDescription>
          Paste the sentence, copy the prompt, and run it in Claude with the skill installed. Attach a
          screenshot in your chat if the sentence needs context. Paste the JSON it returns below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="breakdown-sentence">Sentence</Label>
          <Textarea
            id="breakdown-sentence"
            value={sentence}
            onChange={e => setSentence(e.target.value)}
            placeholder="電気を消してくれる？"
            rows={2}
          />
        </div>
        <Textarea
          readOnly
          value={prompt}
          rows={5}
          className="text-xs"
          aria-label="Generated prompt"
        />
        <Button
          variant="outline"
          onClick={copy}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </CardContent>
    </Card>
  );
}
