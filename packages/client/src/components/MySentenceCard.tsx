import type { MySentence } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { NotebookPen, TriangleAlert } from "lucide-react";

import { useUpdateMySentence } from "../hooks/useMySentences";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * One learner-produced sentence, with an inline correction editor. Writing a correction and saving
 * marks it corrected (clears `needsCorrection`); it can be reopened.
 */
export function MySentenceCard({
  mySentence: ms,
  onDelete,
}: {
  mySentence: MySentence;
  onDelete?: (id: string) => void;
}) {
  const update = useUpdateMySentence();
  const [correction, setCorrection] = useState(ms.correction ?? "");

  const dirty = correction !== (ms.correction ?? "");

  const saveCorrection = () =>
    update.mutate({
      id: ms.id,
      input: {
        correction: correction.trim() || null,
        needsCorrection: false,
      },
    });

  const reopen = () =>
    update.mutate({
      id: ms.id,
      input: {
        needsCorrection: true,
      },
    });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-semibold">{ms.text}</p>
          {onDelete
            ? (
              <button
                type="button"
                onClick={() => onDelete(ms.id)}
                className="
                  shrink-0 text-sm text-destructive
                  hover:underline
                "
              >
                Delete
              </button>
            )
            : null}
        </div>

        {ms.translation ? <p className="text-sm text-muted-foreground">{ms.translation}</p> : null}

        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{ms.language}</Badge>
          {ms.needsCorrection
            ? (
              <Badge
                variant="outline"
                className="gap-1 border-destructive/40 text-destructive"
              >
                <TriangleAlert className="size-3" />
                Needs correction
              </Badge>
            )
            : <Badge variant="outline">Corrected</Badge>}
          {ms.practiceSentenceId
            ? (
              <Link
                to="/practice/$id"
                params={{
                  id: ms.practiceSentenceId,
                }}
                className="
                  inline-flex items-center gap-1
                  hover:text-foreground
                "
              >
                <NotebookPen className="size-3" />
                From practice
              </Link>
            )
            : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Correction</Label>
          <Textarea
            value={correction}
            onChange={e => setCorrection(e.target.value)}
            placeholder="Write the corrected version…"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!dirty || update.isPending}
              onClick={saveCorrection}
            >
              Save correction
            </Button>
            {!ms.needsCorrection
              ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={reopen}
                  disabled={update.isPending}
                >
                  Reopen
                </Button>
              )
              : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
