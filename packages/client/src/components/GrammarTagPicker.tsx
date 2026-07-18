import type { GrammarTagTree } from "@/hooks/useBookmarks";
import type { GrammarNote } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { TagTreeSelect } from "@/components/TagTreeSelect";
import { Label } from "@/components/ui/label";

/**
 * The grammar-tag block of the grammar-note form. In edit mode the tag is fixed and displayed
 * read-only; in create mode it is a chain of comboboxes drilling down the Grammar source's tag tree
 * (into subtags), with loading/error/empty states. When the picked tag already has a note, saving is
 * blocked and a link to the existing note is offered (one note per grammar point).
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
            : tree.nodes.length === 0
              ? (
                <p className="text-sm text-muted-foreground">
                  No grammar tags found. Add tags to the Grammar source in Settings → Bookmarks.
                </p>
              )
              : (
                <>
                  <TagTreeSelect
                    nodes={tree.nodes}
                    rootId={tree.rootId}
                    value={tagId}
                    onChange={onPick}
                    placeholder="Pick a grammar tag…"
                    ariaLabel="Grammar tag"
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
