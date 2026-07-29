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

  /** Save the skill straight to a file, ready to drop at the install path below. */
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
        <CardTitle>AI-Lesson-authoring skill</CardTitle>
        <CardDescription>
          Copy or download this into Claude so it can generate valid AI Lesson JSON — including
          dual-level N4/native content, and converting an existing JSX lesson artifact into the JSON.
          Save it as
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
