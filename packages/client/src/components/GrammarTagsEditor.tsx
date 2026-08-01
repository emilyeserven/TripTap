import type { SentenceTermRef } from "@sentence-bank/types";

import { useState } from "react";

import { Tag } from "lucide-react";

import { TermPicker } from "@/components/TermPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { termsChanged } from "@/lib/terms";

/**
 * Displays one list of Grammar source tags with an inline edit affordance (reusing the shared
 * `TermPicker`), so tags can be changed wherever the tagged thing is shown rather than only on its
 * edit page. Used by AI Lesson grammar items and source sentences, and by My Sentences — which
 * renders it twice, once per grammar list, hence the configurable labels.
 *
 * `onTagClick`, when provided, turns each tag badge into a filter button (used on the browse pages
 * to surface the grammar↔sentence connection).
 */
export function GrammarTagsEditor({
  value,
  onSave,
  isPending = false,
  onTagClick,
  label = "Grammar tags",
  addLabel = "Add grammar tags",
}: {
  value: SentenceTermRef[] | null;
  onSave: (terms: SentenceTermRef[] | null) => void;
  isPending?: boolean;
  onTagClick?: (termId: string) => void;
  /** Names this list in the badge row and the picker. */
  label?: string;
  /** Call to action when the list is empty. */
  addLabel?: string;
}) {
  const current = value ?? [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SentenceTermRef[]>(current);
  const dirty = termsChanged(draft, current);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {current.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">{label}:</span>
            {current.map(term =>
              onTagClick
                ? (
                  <button
                    key={`${term.sourceId}:${term.id}`}
                    type="button"
                    onClick={() => onTagClick(term.id)}
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
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => {
            setDraft(current);
            setEditing(v => !v);
          }}
        >
          <Tag className="size-3.5" />
          {editing ? "Close" : current.length > 0 ? "Edit tags" : addLabel}
        </Button>
      </div>
      {editing
        ? (
          <div className="space-y-2 rounded-md border p-3">
            <TermPicker
              category="grammar"
              label={label}
              value={draft}
              onChange={setDraft}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!dirty || isPending}
                onClick={() => {
                  onSave(draft.length > 0 ? draft : null);
                  setEditing(false);
                }}
              >
                {isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(current);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )
        : null}
    </div>
  );
}
