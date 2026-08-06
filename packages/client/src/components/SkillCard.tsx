import type { ReactNode } from "react";

import { useRef } from "react";

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
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

/**
 * A Claude skill's markdown in a copyable, downloadable textarea, with its install path.
 *
 * The AI-Lesson and sentence-breakdown cards were the same component twice over — identical copy
 * handler, identical download-via-Blob dance, identical JSX — differing only in the markdown they
 * import, their title, and their install path. Those are now props.
 *
 * The markdown is imported `?raw` by the caller so the textarea can never drift from the file on
 * disk.
 */
export function SkillCard({
  title,
  description,
  markdown,
  ariaLabel,
}: {
  title: string;
  /** Explains what the skill does and where to save it; callers include the path as a <code>. */
  description: ReactNode;
  /** The skill's markdown, imported `?raw`. */
  markdown: string;
  ariaLabel: string;
}) {
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const {
    copied, copy,
  } = useCopyToClipboard({
    resetAfterMs: 1500,
  });

  /** Save the skill straight to a file, ready to drop at the install path in the description. */
  function download() {
    const blob = new Blob([markdown], {
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          ref={outputRef}
          readOnly
          value={markdown}
          rows={12}
          className="font-mono text-xs"
          aria-label={ariaLabel}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void copy(markdown, outputRef.current)}
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
