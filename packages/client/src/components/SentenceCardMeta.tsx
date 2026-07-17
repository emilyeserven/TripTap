import type { Sentence } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Camera, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { groupTermsByCategory, TERM_CATEGORIES } from "@/lib/terms";

/**
 * The metadata row under a sentence: language badge, source (linked when it resolves to a taxonomy
 * source), page, capture link, free-text tags, and the per-channel term badges. Grammar badges become
 * filter buttons when `onGrammarTagClick` is provided.
 */
export function SentenceCardMeta({
  sentence,
  sourceName,
  onGrammarTagClick,
}: {
  sentence: Sentence;
  sourceName?: string | null;
  onGrammarTagClick?: (termId: string) => void;
}) {
  const tags = (sentence.tags ?? "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
  const termGroups = groupTermsByCategory(sentence.terms ?? []);

  // Prefer the resolved taxonomy source name; fall back to the legacy free-text `source` for old rows.
  const sourceId = sentence.sourceId;
  const displaySource = sourceId ? sourceName ?? null : sentence.source;
  const pageLabel = sentence.page ? `p. ${sentence.page}` : null;

  return (
    <div
      className="
        flex flex-wrap items-center gap-2 text-xs text-muted-foreground
      "
    >
      <Badge variant="secondary">{sentence.language}</Badge>
      {sourceId && displaySource
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
                id: sourceId,
              }}
            >
              <Database className="size-3" />
              {displaySource}
            </Link>
          </Button>
        )
        : displaySource
          ? <span>{displaySource}</span>
          : null}
      {pageLabel ? <span>{pageLabel}</span> : null}
      {sentence.captureId
        ? (
          <Link
            to="/captures/$id"
            params={{
              id: sentence.captureId,
            }}
            className="
              inline-flex items-center gap-1
              hover:text-blue-700
            "
          >
            <Camera className="size-3" />
            Capture
          </Link>
        )
        : null}
      {tags.map(tag => (
        <span
          key={tag}
          className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700"
        >
          {tag}
        </span>
      ))}
      {TERM_CATEGORIES.map(({
        category, label,
      }) => {
        const terms = termGroups[category];
        if (terms.length === 0) return null;
        return (
          <span
            key={category}
            className="inline-flex flex-wrap items-center gap-1"
          >
            <span className="text-xs text-muted-foreground">{label}:</span>
            {terms.map(term =>
              category === "grammar" && onGrammarTagClick
                ? (
                  <button
                    key={`${term.sourceId}:${term.id}`}
                    type="button"
                    onClick={() => onGrammarTagClick(term.id)}
                    title={`Filter by ${term.name}`}
                  >
                    <Badge
                      variant="outline"
                      className="
                        cursor-pointer
                        hover:bg-muted
                      "
                    >
                      {term.name}
                    </Badge>
                  </button>
                )
                : (
                  <Badge
                    key={`${term.sourceId}:${term.id}`}
                    variant="outline"
                    title={term.sourceLabel ? `${term.sourceLabel} (${term.kind})` : undefined}
                  >
                    {term.name}
                  </Badge>
                ))}
          </span>
        );
      })}
    </div>
  );
}
