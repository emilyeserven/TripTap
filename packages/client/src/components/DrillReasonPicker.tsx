import type { DrillMistakeReasonRef, DrillReason, DrillSubcategory } from "@sentence-bank/types";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateDrillReasonCategory,
  useDrillReasonCategories,
  useUpdateDrillReasonCategory,
} from "@/hooks/useDrillReasonCategories";
import { flattenReasons } from "@/lib/drill-reasons";
import { newId } from "@/lib/id";

const NEW = "__new";
const NONE = "__none";

/**
 * Picks the reasons a mistake is tagged with, from the reusable Category → Subcategory → Reason
 * taxonomy. Existing reasons are chosen from a searchable multi-select (labelled with their full
 * path). Typing something new is handled by the "New reason" panel, which lets you place it under an
 * existing or brand-new category/subcategory; the new reason is created in the taxonomy and selected.
 */
export function DrillReasonPicker({
  value,
  onChange,
}: {
  value: DrillMistakeReasonRef[];
  onChange: (reasons: DrillMistakeReasonRef[]) => void;
}) {
  const categoriesQuery = useDrillReasonCategories();
  const createCategory = useCreateDrillReasonCategory();
  const updateCategory = useUpdateDrillReasonCategory();

  const categories = categoriesQuery.data ?? [];
  const flat = flattenReasons(categories);
  const options = flat.map(f => ({
    value: f.reasonId,
    label: f.path,
  }));

  const selectedReasonIds = value
    .map(r => r.reasonId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const [adding, setAdding] = useState(false);
  const [catChoice, setCatChoice] = useState<string>(NEW);
  const [newCatName, setNewCatName] = useState("");
  const [subChoice, setSubChoice] = useState<string>(NONE);
  const [newSubName, setNewSubName] = useState("");
  const [reasonName, setReasonName] = useState("");

  const chosenCategory = categories.find(c => c.id === catChoice) ?? null;
  const chosenSubcategories = chosenCategory?.subcategories ?? [];
  const creatingReason = createCategory.isPending || updateCategory.isPending;

  function selectExisting(ids: string[]) {
    onChange(ids.map((id) => {
      const existing = value.find(r => r.reasonId === id);
      if (existing) return existing;
      const f = flat.find(o => o.reasonId === id);
      return {
        categoryId: f?.categoryId ?? "",
        subcategoryId: f?.subcategoryId ?? null,
        reasonId: id,
      };
    }));
  }

  function resetAddForm() {
    setAdding(false);
    setCatChoice(NEW);
    setNewCatName("");
    setSubChoice(NONE);
    setNewSubName("");
    setReasonName("");
  }

  const newCategory = catChoice === NEW;
  const newSubcategory = subChoice === NEW;
  const canAdd = reasonName.trim().length > 0
    && (newCategory ? newCatName.trim().length > 0 : true)
    && (newSubcategory ? newSubName.trim().length > 0 : true)
    && !creatingReason;

  async function addReason() {
    if (!canAdd) return;
    const reasonId = newId();
    const reason = {
      id: reasonId,
      name: reasonName.trim(),
    };

    try {
      if (newCategory) {
        // Brand-new category, holding either a fresh subcategory or the reason directly.
        const subId = newSubcategory ? newId() : null;
        const created = await createCategory.mutateAsync(
          newSubcategory
            ? {
              name: newCatName.trim(),
              subcategories: [{
                id: subId as string,
                name: newSubName.trim(),
                reasons: [reason],
              }],
            }
            : {
              name: newCatName.trim(),
              reasons: [reason],
            },
        );
        onChange([...value, {
          categoryId: created.id,
          subcategoryId: subId,
          reasonId,
        }]);
      }
      else if (chosenCategory) {
        let subId: string | null;
        const input: { subcategories?: DrillSubcategory[];
          reasons?: DrillReason[]; } = {};
        if (subChoice === NONE) {
          // Attach the reason directly to the category (no subcategory).
          subId = null;
          input.reasons = [...(chosenCategory.reasons ?? []), reason];
        }
        else {
          // Append to an existing subcategory, or add a new one holding the reason.
          const existing = chosenCategory.subcategories ?? [];
          if (newSubcategory) {
            subId = newId();
            input.subcategories = [...existing, {
              id: subId,
              name: newSubName.trim(),
              reasons: [reason],
            }];
          }
          else {
            subId = subChoice;
            input.subcategories = existing.map(s =>
              s.id === subId
                ? {
                  ...s,
                  reasons: [...s.reasons, reason],
                }
                : s);
          }
        }
        await updateCategory.mutateAsync({
          id: chosenCategory.id,
          input,
        });
        onChange([...value, {
          categoryId: chosenCategory.id,
          subcategoryId: subId,
          reasonId,
        }]);
      }
      resetAddForm();
    }
    catch {
      // Surfaced via the mutation's onError toast; keep the form for a retry.
    }
  }

  return (
    <div className="space-y-2">
      <MultiSelect
        value={selectedReasonIds}
        onChange={selectExisting}
        options={options}
        ariaLabel="Reasons"
        placeholder="Tag reasons…"
        searchPlaceholder="Search reasons…"
        emptyText={categoriesQuery.isLoading
          ? "Loading reasons…"
          : "No reasons yet — add one below."}
      />

      {adding
        ? (
          <div className="space-y-3 rounded-md border p-3">
            <div
              className="
                grid gap-2
                sm:grid-cols-2
              "
            >
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={catChoice}
                  onValueChange={(next) => {
                    setCatChoice(next);
                    setSubChoice(NONE);
                  }}
                >
                  <SelectTrigger
                    aria-label="Category"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW}>+ New category…</SelectItem>
                  </SelectContent>
                </Select>
                {newCategory
                  ? (
                    <Input
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="New category name"
                      aria-label="New category name"
                    />
                  )
                  : null}
              </div>

              <div className="space-y-1.5">
                <Label>Subcategory (optional)</Label>
                <Select
                  value={subChoice}
                  onValueChange={setSubChoice}
                >
                  <SelectTrigger
                    aria-label="Subcategory"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>(No subcategory)</SelectItem>
                    {chosenSubcategories.map(s => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW}>+ New subcategory…</SelectItem>
                  </SelectContent>
                </Select>
                {newSubcategory
                  ? (
                    <Input
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      placeholder="New subcategory name"
                      aria-label="New subcategory name"
                    />
                  )
                  : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                value={reasonName}
                onChange={e => setReasonName(e.target.value)}
                placeholder="e.g. Wrong tense"
                aria-label="Reason name"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!canAdd}
                onClick={() => void addReason()}
              >
                {creatingReason ? "Adding…" : "Add reason"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetAddForm}
              >
                Cancel
              </Button>
            </div>
          </div>
        )
        : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" />
            New reason
          </Button>
        )}
    </div>
  );
}
