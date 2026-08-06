import type { Dialogue } from "@sentence-bank/types";

import { dialogueSpeakers, isSelfSpeaker } from "@sentence-bank/types";
import { Link } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { speakerAccent } from "@/lib/dialogue";
import { cn } from "@/lib/utils";

/** One dialogue in the index list. Links to its transcript view. */
export function DialogueCard({
  dialogue,
}: {
  dialogue: Dialogue;
}) {
  const lineCount = dialogue.lines?.length ?? 0;
  const speakers = dialogueSpeakers(dialogue.lines);

  return (
    <Link
      to="/dialogues/$id"
      params={{
        id: dialogue.id,
      }}
      className="block"
    >
      <Card
        className="
          transition-colors
          hover:border-primary
        "
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare className="size-4 shrink-0 text-muted-foreground" />
            {dialogue.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {dialogue.date} · {lineCount} {lineCount === 1 ? "line" : "lines"}
          </p>
          {dialogue.bookmarkTitle && (
            <p className="truncate text-xs">
              From {dialogue.bookmarkTitle}
              {dialogue.section && ` · ${dialogue.section.label}`}
            </p>
          )}
          {speakers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {speakers.map(speaker => (
                <span
                  key={speaker}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    isSelfSpeaker(speaker, dialogue.selfSpeakers)
                      ? "bg-primary text-primary-foreground"
                      : speakerAccent(speaker),
                  )}
                >
                  {speaker}
                </span>
              ))}
            </div>
          )}
          {dialogue.countsTowardXp && (
            <Badge variant="secondary">
              Earns XP · {dialogue.learningArea ?? "Speaking"}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
