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
import { Textarea } from "@/components/ui/textarea";
// The skill's markdown, imported raw so the textarea can never drift from the file.
import skillMd from "@/content/ai-lesson-skill.md?raw";

/** Shows the AI-Lesson-authoring skill in a copyable textarea, with its install path. */
export function SkillInstallCard() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(skillMd);
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
        <CardTitle>AI-Lesson-authoring skill</CardTitle>
        <CardDescription>
          Copy this into Claude so it can generate valid AI Lesson JSON. Save it as
          {" "}
          <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">
            ~/.claude/skills/sentence-bank-lesson/SKILL.md
          </code>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          readOnly
          value={skillMd}
          rows={12}
          className="font-mono text-xs"
          aria-label="AI Lesson skill (SKILL.md)"
        />
        <Button
          variant="outline"
          onClick={copy}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy SKILL.md"}
        </Button>
      </CardContent>
    </Card>
  );
}
