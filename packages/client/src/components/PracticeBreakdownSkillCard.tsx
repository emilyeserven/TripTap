import { useState } from "react";

import { Check, Copy, Download } from "lucide-react";

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
import skillMd from "@/content/practice-breakdown-skill.md?raw";

/** Shows the sentence-breakdown skill in a copyable textarea, with its install path. */
export function PracticeBreakdownSkillCard() {
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

  function download() {
    const blob = new Blob([skillMd], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = "SKILL.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentence-breakdown skill</CardTitle>
        <CardDescription>
          Copy or download this into Claude so it can break a single sentence down into valid practice
          JSON — reading, translation, target, word/grammar notes. Save it as
          {" "}
          <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">
            ~/.claude/skills/sentence-bank-breakdown/SKILL.md
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
          aria-label="Sentence-breakdown skill (SKILL.md)"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={copy}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy SKILL.md"}
          </Button>
          <Button
            variant="outline"
            onClick={download}
          >
            <Download className="size-4" />
            Download .md
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
