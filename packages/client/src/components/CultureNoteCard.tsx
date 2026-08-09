import type { CultureNote } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";

import { AiLessonIcon } from "@/components/ai-lesson/icon-map";
import { VocabPill } from "@/components/ai-lesson/VocabPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * A user-authored culture note, styled to sit beside {@link
 * ../ai-lesson/CultureCard AI-lesson culture cards} on the unified Culture page. Headings are
 * optional — a one-sentence note is just its body.
 */
export function CultureNoteCard({
  note,
  topicsById,
}: {
  note: CultureNote;
  /** Topic id → name; stale ids simply don't render. */
  topicsById: Record<string, string>;
}) {
  const topicNames = note.topicIds
    .map(id => topicsById[id])
    .filter((name): name is string => name !== undefined);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Link
            to="/culture/$id"
            params={{
              id: note.id,
            }}
            className="
              flex size-9 shrink-0 items-center justify-center rounded-md
              bg-muted
            "
            aria-label="Open note"
          >
            <AiLessonIcon
              name={note.icon ?? "landmark"}
              className="size-4"
            />
          </Link>
          <div className="min-w-0">
            {note.titleJp || note.titleEn
              ? (
                <>
                  {note.titleJp
                    ? (
                      <CardTitle className="text-base">
                        <Link
                          to="/culture/$id"
                          params={{
                            id: note.id,
                          }}
                          className="hover:underline"
                        >
                          {note.titleJp}
                        </Link>
                      </CardTitle>
                    )
                    : null}
                  <div className="text-sm text-muted-foreground">
                    {note.titleJp
                      ? note.titleEn
                      : (
                        <Link
                          to="/culture/$id"
                          params={{
                            id: note.id,
                          }}
                          className="
                            font-medium text-foreground
                            hover:underline
                          "
                        >
                          {note.titleEn}
                        </Link>
                      )}
                  </div>
                </>
              )
              : null}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Badge variant="secondary">Yours</Badge>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-7"
            >
              <Link
                to="/culture/$id/edit"
                params={{
                  id: note.id,
                }}
                aria-label="Edit note"
              >
                <Pencil className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {note.bodyJa
          ? (
            <p
              lang="ja"
              className="text-sm/relaxed"
            >
              {note.bodyJa}
            </p>
          )
          : null}
        {note.bodyEn
          ? (
            <p
              className={note.bodyJa
                ? "text-sm/relaxed text-muted-foreground"
                : "text-sm/relaxed"}
            >
              {note.bodyEn}
            </p>
          )
          : null}
        {topicNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topicNames.map(name => (
              <Badge
                key={name}
                variant="outline"
              >
                {name}
              </Badge>
            ))}
          </div>
        )}
        {note.terms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.terms.map(t => (
              <VocabPill
                key={t}
                term={t}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
