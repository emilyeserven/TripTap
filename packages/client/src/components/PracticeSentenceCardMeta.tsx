import type { PracticeSentence } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Camera, Database, ScrollText, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Short labels for the comprehension badge. */
const COMPREHENSION_LABEL = {
  ready: "Ready to card",
  studying: "Studying",
  skip: "Skip",
} as const;

/**
 * The metadata row under a practice sentence: language, comprehension and needs-correction badges,
 * the target, register, source link, page, capture/origin links, and the term badges.
 */
export function PracticeSentenceCardMeta({
  practiceSentence: ps,
  sourceName,
}: {
  practiceSentence: PracticeSentence;
  sourceName?: string | null;
}) {
  const pageLabel = ps.page ? `p. ${ps.page}` : null;
  return (
    <div
      className="
        flex flex-wrap items-center gap-2 text-xs text-muted-foreground
      "
    >
      <Badge variant="secondary">{ps.language}</Badge>
      {ps.comprehension
        ? (
          <Badge
            variant={ps.comprehension === "ready" ? "default" : "outline"}
            title="How well you understand this sentence (Tofugu curation)"
          >
            {COMPREHENSION_LABEL[ps.comprehension]}
          </Badge>
        )
        : null}
      {ps.needsCorrection
        ? (
          <Badge
            variant="outline"
            className="gap-1 border-destructive/40 text-destructive"
            title="Not professionally written — may need corrections"
          >
            <TriangleAlert className="size-3" />
            Needs correction
          </Badge>
        )
        : null}
      {ps.target
        ? (
          <Badge
            className="gap-1"
            title={ps.targetKind ?? undefined}
          >
            {ps.target}
          </Badge>
        )
        : null}
      {ps.register ? <span>{ps.register}</span> : null}
      {ps.sourceId && sourceName
        ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2"
          >
            <Link
              to="/sources/$id"
              params={{
                id: ps.sourceId,
              }}
            >
              <Database className="size-3" />
              {sourceName}
            </Link>
          </Button>
        )
        : null}
      {pageLabel ? <span>{pageLabel}</span> : null}
      {ps.captureId
        ? (
          <Link
            to="/captures/$id"
            params={{
              id: ps.captureId,
            }}
            className="
              inline-flex items-center gap-1
              hover:text-foreground
            "
          >
            <Camera className="size-3" />
            Capture
          </Link>
        )
        : null}
      {ps.sentenceId
        ? (
          <Link
            to="/sentences"
            className="
              inline-flex items-center gap-1
              hover:text-foreground
            "
          >
            <ScrollText className="size-3" />
            From a sentence
          </Link>
        )
        : null}
      {(ps.terms ?? []).map(term => (
        <Badge
          key={`${term.sourceId}:${term.id}`}
          variant="outline"
          title={`${term.category ?? "vocabulary"}${term.sourceLabel ? ` · ${term.sourceLabel}` : ""}`}
        >
          {term.name}
        </Badge>
      ))}
    </div>
  );
}
