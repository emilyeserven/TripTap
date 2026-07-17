import type { ReasonPlacement } from "@/lib/drill-reasons";
import type { DrillMistakeReasonRef, DrillReasonCategory } from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateDrillReasonCategory,
  useUpdateDrillReasonCategory,
} from "@/hooks/useDrillReasonCategories";
import { planReasonAddition } from "@/lib/drill-reasons";
import { newId } from "@/lib/id";

const NEW = "__new";
const NONE = "__none";

/**
 * The "New reason" panel of the drill-reason picker: name a reason and place it under an existing or
 * brand-new category/subcategory. Creates or updates the taxonomy, then reports the new reason's ref
 * via `onCreated` so the picker can select it.
 */
export function NewDrillReasonForm({
  categories,
  onCreated,
  onCancel,
}: {
  categories: DrillReasonCategory[];
  onCreated: (ref: DrillMistakeReasonRef) => void;
  onCancel: () => void;
}) {
  const createCategory = useCreateDrillReasonCategory();
  const updateCategory = useUpdateDrillReasonCategory();

  const [catChoice, setCatChoice] = useState<string>(NEW);
  const [newCatName, setNewCatName] = useState("");
  const [subChoice, setSubChoice] = useState<string>(NONE);
  const [newSubName, setNewSubName] = useState("");
  const [reasonName, setReasonName] = useState("");

  const chosenCategory = categories.find(c => c.id === catChoice) ?? null;
  const chosenSubcategories = chosenCategory?.subcategories ?? [];
  const creatingReason = createCategory.isPending || updateCategory.isPending;

  const newCategory = catChoice === NEW;
  const newSubcategory = subChoice === NEW;
  const canAdd = reasonName.trim().length > 0
    && (newCategory ? newCatName.trim().length > 0 : true)
    && (newSubcategory ? newSubName.trim().length > 0 : true)
    && !creatingReason;

  async function addReason() {
    if (!canAdd || (!newCategory && !chosenCategory)) return;
    const reason = {
      id: newId(),
      name: reasonName.trim(),
    };
    const placement: ReasonPlacement = {
      category: newCategory
        ? {
          kind: "new",
          name: newCatName,
        }
        : {
          kind: "existing",
          category: chosenCategory as DrillReasonCategory,
        },
      sub: newSubcategory
        ? {
          kind: "new",
          name: newSubName,
        }
        : subChoice === NONE
          ? {
            kind: "none",
          }
          : {
            kind: "existing",
            id: subChoice,
          },
    };
    const plan = planReasonAddition(placement, reason, newId);

    try {
      const categoryId = plan.kind === "create"
        ? (await createCategory.mutateAsync(plan.input)).id
        : (await updateCategory.mutateAsync({
          id: plan.categoryId,
          input: plan.input,
        }), plan.categoryId);
      onCreated({
        categoryId,
        subcategoryId: plan.subId,
        reasonId: reason.id,
      });
    }
    catch {
      // Surfaced via the mutation's onError toast; keep the form for a retry.
    }
  }

  return (
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
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
