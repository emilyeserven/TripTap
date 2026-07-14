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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Builds a copyable prompt that activates the sentence-bank-lesson skill for a URL or topic. */
export function AiLessonPromptGenerator() {
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("N4");
  const [copied, setCopied] = useState(false);

  const target = source.trim() || "<paste a URL, or describe a topic>";
  const prompt
    = `Use the sentence-bank-lesson skill. Read ${target} and produce a complete `
      + `AI Lesson JSON at target level ${level}. Output only the JSON.`;

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
        <CardTitle>Generate an AI Lesson prompt</CardTitle>
        <CardDescription>
          Give a URL (or a topic), copy the prompt, and run it in Claude with the skill installed.
          Paste the JSON it returns below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="
            grid gap-3
            sm:grid-cols-[1fr_6rem]
          "
        >
          <div className="space-y-1">
            <Label htmlFor="ai-lesson-source">Source URL or topic</Label>
            <Input
              id="ai-lesson-source"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="https://…  or  ordering at a café"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ai-lesson-level">Level</Label>
            <Input
              id="ai-lesson-level"
              value={level}
              onChange={e => setLevel(e.target.value)}
            />
          </div>
        </div>
        <Textarea
          readOnly
          value={prompt}
          rows={3}
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
