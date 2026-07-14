import type { DrillReason, DrillReasonCategory, DrillSubcategory } from "@sentence-bank/types";

import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateDrillReasonCategory,
  useDeleteDrillReasonCategory,
  useDrillReasonCategories,
  useUpdateDrillReasonCategory,
} from "@/hooks/useDrillReasonCategories";
import { newId } from "@/lib/id";

/**
 * Manage page for the reusable mistake-reason taxonomy. Add top-level categories, and within each edit
 * its subcategories and their reasons. Each category card commits its edits with its own Save button.
 */
export function DrillReasonsManager() {
  const categoriesQuery = useDrillReasonCategories();
  const createCategory = useCreateDrillReasonCategory();
  const [newName, setNewName] = useState("");

  const categories = categoriesQuery.data ?? [];
  const nothing = !categoriesQuery.isLoading && categories.length === 0;

  const addCategory = async () => {
    const name = newName.trim();
    if (!name || createCategory.isPending) return;
    await createCategory.mutateAsync({
      name,
    });
    setNewName("");
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Define the reasons you tag mistakes with, grouped into categories and subcategories. These are
          shared across every drill session, so your statistics stay consistent over time.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void addCategory();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="new-category">New category</Label>
          <Input
            id="new-category"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Grammar"
            className="w-64"
          />
        </div>
        <Button
          type="submit"
          disabled={newName.trim().length === 0 || createCategory.isPending}
        >
          <Plus className="size-4" />
          Add category
        </Button>
      </form>

      {categoriesQuery.error
        ? <p className="text-destructive">{categoriesQuery.error.message}</p>
        : null}
      {categoriesQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? <p className="text-muted-foreground">No categories yet. Add one above.</p>
        : null}

      <div className="space-y-4">
        {categories.map(category => (
          <CategoryEditor
            key={`${category.id}:${category.updatedAt}`}
            category={category}
          />
        ))}
      </div>
    </section>
  );
}

/** One category card with editable name, subcategories, and reasons. Remounts fresh after each save. */
function CategoryEditor({
  category,
}: {
  category: DrillReasonCategory;
}) {
  const update = useUpdateDrillReasonCategory();
  const remove = useDeleteDrillReasonCategory();

  const [name, setName] = useState(category.name);
  const [subcategories, setSubcategories] = useState<DrillSubcategory[]>(
    category.subcategories ?? [],
  );
  const [catReasons, setCatReasons] = useState<DrillReason[]>(category.reasons ?? []);

  const addCatReason = () =>
    setCatReasons([...catReasons, {
      id: newId(),
      name: "",
    }]);
  const patchCatReason = (reasonId: string, reasonName: string) =>
    setCatReasons(catReasons.map(r => (r.id === reasonId
      ? {
        ...r,
        name: reasonName,
      }
      : r)));
  const removeCatReason = (reasonId: string) =>
    setCatReasons(catReasons.filter(r => r.id !== reasonId));

  const addSubcategory = () =>
    setSubcategories([...subcategories, {
      id: newId(),
      name: "",
      reasons: [],
    }]);
  const patchSubcategory = (id: string, part: Partial<DrillSubcategory>) =>
    setSubcategories(subcategories.map(s => (s.id === id
      ? {
        ...s,
        ...part,
      }
      : s)));
  const removeSubcategory = (id: string) =>
    setSubcategories(subcategories.filter(s => s.id !== id));

  const addReason = (subId: string) => {
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) return;
    patchSubcategory(subId, {
      reasons: [...sub.reasons, {
        id: newId(),
        name: "",
      }],
    });
  };
  const patchReason = (subId: string, reasonId: string, reasonName: string) => {
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) return;
    patchSubcategory(subId, {
      reasons: sub.reasons.map(r => (r.id === reasonId
        ? {
          ...r,
          name: reasonName,
        }
        : r)),
    });
  };
  const removeReason = (subId: string, reasonId: string) => {
    const sub = subcategories.find(s => s.id === subId);
    if (!sub) return;
    patchSubcategory(subId, {
      reasons: sub.reasons.filter(r => r.id !== reasonId),
    });
  };

  const save = () => {
    // Drop empty subcategory/reason names so blanks don't accumulate in the taxonomy.
    const cleaned = subcategories
      .map(s => ({
        ...s,
        name: s.name.trim(),
        reasons: s.reasons.filter(r => r.name.trim().length > 0).map(r => ({
          ...r,
          name: r.name.trim(),
        })),
      }))
      .filter(s => s.name.length > 0);
    const cleanedReasons = catReasons
      .filter(r => r.name.trim().length > 0)
      .map(r => ({
        ...r,
        name: r.name.trim(),
      }));
    update.mutate({
      id: category.id,
      input: {
        name: name.trim() || category.name,
        subcategories: cleaned,
        reasons: cleanedReasons,
      },
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-1.5">
            <Label>Category name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-64"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(category.id)}
          >
            <Trash2 className="size-4" />
            Delete category
          </Button>
        </div>

        <div className="space-y-3">
          {subcategories.map(sub => (
            <div
              key={sub.id}
              className="space-y-2 rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={sub.name}
                  onChange={e => patchSubcategory(sub.id, {
                    name: e.target.value,
                  })}
                  placeholder="Subcategory (e.g. Verb conjugation)"
                  aria-label="Subcategory name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeSubcategory(sub.id)}
                  aria-label="Delete subcategory"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <ul className="space-y-1.5 pl-4">
                {sub.reasons.map(reason => (
                  <li
                    key={reason.id}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={reason.name}
                      onChange={e => patchReason(sub.id, reason.id, e.target.value)}
                      placeholder="Reason (e.g. Wrong tense)"
                      aria-label="Reason name"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeReason(sub.id, reason.id)}
                      aria-label="Delete reason"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addReason(sub.id)}
              >
                <Plus className="size-4" />
                Add reason
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSubcategory}
          >
            <Plus className="size-4" />
            Add subcategory
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-dashed p-3">
          <Label className="text-xs text-muted-foreground">Reasons (no subcategory)</Label>
          <ul className="space-y-1.5">
            {catReasons.map(reason => (
              <li
                key={reason.id}
                className="flex items-center gap-2"
              >
                <Input
                  value={reason.name}
                  onChange={e => patchCatReason(reason.id, e.target.value)}
                  placeholder="Reason (e.g. Careless)"
                  aria-label="Reason name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeCatReason(reason.id)}
                  aria-label="Delete reason"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCatReason}
          >
            <Plus className="size-4" />
            Add reason
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={update.isPending}
          onClick={save}
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
