import type { DrillMistakeReasonRef } from "@sentence-bank/types";

import { useState } from "react";

import { Plus } from "lucide-react";

import { NewDrillReasonForm } from "@/components/NewDrillReasonForm";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { useDrillReasonCategories } from "@/hooks/useDrillReasonCategories";
import { flattenReasons } from "@/lib/drill-reasons";

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
          <NewDrillReasonForm
            categories={categories}
            onCreated={(ref) => {
              onChange([...value, ref]);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
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
