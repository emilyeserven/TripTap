import type { WritingPrompt } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";

import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * One saved writing prompt in the list. Read-only: shows the Japanese prompt by default with a
 * per-card toggle to reveal the English version, plus a difficulty badge. Editing and deleting live on
 * the prompt's dedicated edit page, reached via the Edit link.
 */
export function WritingPromptCard({
  prompt,
}: {
  prompt: WritingPrompt;
}) {
  const [showEnglish, setShowEnglish] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{prompt.text}</h2>
            <DifficultyBadge difficulty={prompt.difficulty} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {prompt.textEn
              ? (
                <button
                  type="button"
                  onClick={() => setShowEnglish(v => !v)}
                  className="
                    text-sm text-muted-foreground
                    hover:underline
                  "
                >
                  {showEnglish ? "Hide English" : "Show English"}
                </button>
              )
              : null}
            <Link
              to="/writing-prompts/$id"
              params={{
                id: prompt.id,
              }}
              className="
                text-sm text-muted-foreground
                hover:underline
              "
            >
              Edit
            </Link>
          </div>
        </div>
        {showEnglish && prompt.textEn
          ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{prompt.textEn}</p>
          : null}
      </CardContent>
    </Card>
  );
}
