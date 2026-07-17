import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

/**
 * The grammar-tag block of the grammar-note form. In edit mode the tag is fixed and displayed
 * read-only; in create mode it is a combobox over the grammar tags that don't have a note yet,
 * with loading/error/empty states.
 */
export function GrammarTagPicker({
  editing,
  tagName,
  tagId,
  options,
  isLoading,
  hasError,
  onPick,
}: {
  editing: boolean;
  tagName: string;
  tagId: string;
  options: { value: string;
    label: string; }[];
  isLoading: boolean;
  hasError: boolean;
  onPick: (id: string) => void;
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
      {isLoading
        ? <p className="text-sm text-muted-foreground">Loading grammar tags…</p>
        : hasError
          ? (
            <p className="text-sm text-destructive">
              Couldn’t reach the Grammar source. Configure it in Settings → Bookmarks.
            </p>
          )
          : options.length === 0
            ? (
              <p className="text-sm text-muted-foreground">
                No grammar tags left to note. Add tags to the Grammar source in Settings →
                Bookmarks, or every tag already has a note.
              </p>
            )
            : (
              <Combobox
                value={tagId}
                onChange={onPick}
                options={options}
                placeholder="Pick a grammar tag…"
                searchPlaceholder="Search grammar tags…"
                ariaLabel="Grammar tag"
                className="w-full max-w-md"
              />
            )}
    </div>
  );
}
