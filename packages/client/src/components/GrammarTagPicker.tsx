import type { GrammarTagTree } from "@/hooks/useBookmarks";
import type { GrammarNote } from "@sentence-bank/types";

import { useMemo } from "react";

import { Link } from "@tanstack/react-router";

import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { tagSectionOptions } from "@/lib/tag-sections";

/**
 * The grammar-tag block of the grammar-note form. In edit mode the tag is fixed and displayed
 * read-only; in create mode it is a single searchable combobox whose options are the whole Grammar
 * source tree — subtags included — grouped into sections by parent, so any tag is one click away.
 * When the picked tag already has a note, saving is blocked and a link to it is offered.
 */
export function GrammarTagPicker({
  editing,
  tagName,
  tagId,
  tree,
  notedNote,
  onPick,
}: {
  editing: boolean;
  tagName: string;
  tagId: string;
  tree: GrammarTagTree;
  /** The existing note for the currently-picked tag, or null — blocks creating a duplicate. */
  notedNote: GrammarNote | null;
  onPick: (id: string, name: string) => void;
}) {
  const options = useMemo(
    () => tagSectionOptions(tree.nodes, tree.rootId, tree.rootLabel),
    [tree.nodes, tree.rootId, tree.rootLabel],
  );

  if (editing) {
    return (
      <div className="space-y-1.5">
        <Label>Grammar point</Label>
        <p className="text-sm text-muted-foreground">
          {tagName} — from the Grammar source. The tag can’t be changed after creation.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="grammar-tag">Grammar tag</Label>
      {!tree.configured
        ? (
          <p className="text-sm text-muted-foreground">
            No Grammar source configured. Set one in Settings → Bookmarks.
          </p>
        )
        : tree.isLoading
          ? <p className="text-sm text-muted-foreground">Loading grammar tags…</p>
          : tree.isError
            ? (
              <p className="text-sm text-destructive">
                Couldn’t reach the Grammar source. Configure it in Settings → Bookmarks.
              </p>
            )
            : options.length === 0
              ? (
                <p className="text-sm text-muted-foreground">
                  No grammar tags found. Add tags to the Grammar source in Settings → Bookmarks.
                </p>
              )
              : (
                <>
                  <Combobox
                    value={tagId}
                    onChange={id => onPick(id, options.find(o => o.value === id)?.label ?? "")}
                    options={options}
                    placeholder="Pick a grammar tag…"
                    searchPlaceholder="Search grammar tags…"
                    ariaLabel="Grammar tag"
                    className="w-full max-w-md"
                  />
                  {notedNote
                    ? (
                      <p className="text-sm text-muted-foreground">
                        This tag already has a note —
                        {" "}
                        <Link
                          to="/grammar-notes/$id"
                          params={{
                            id: notedNote.id,
                          }}
                          className="underline underline-offset-2"
                        >
                          open it
                        </Link>
                        .
                      </p>
                    )
                    : null}
                </>
              )}
    </div>
  );
}
