import type {
  CreateDrillReasonCategoryInput,
  DrillMistakeReasonRef,
  DrillReason,
  DrillReasonCategory,
  DrillSubcategory,
  UpdateDrillReasonCategoryInput,
} from "@sentence-bank/types";

/** Separator used when rendering a reason's `Category › Subcategory › Reason` path. */
export const REASON_PATH_SEP = " › ";

/**
 * A reason flattened out of the taxonomy tree, carrying its ancestry for labels and options.
 * `subcategoryId`/`subcategoryName` are null for reasons attached directly to a category.
 */
export interface FlatReason {
  categoryId: string;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  reasonId: string;
  reasonName: string;
  /** `Category › Subcategory › Reason`, or `Category › Reason` when there's no subcategory. */
  path: string;
}

/** Flatten every reason across all categories into a single list, deepest-labelled for pickers. */
export function flattenReasons(categories: DrillReasonCategory[]): FlatReason[] {
  const out: FlatReason[] = [];
  for (const category of categories) {
    for (const sub of category.subcategories ?? []) {
      for (const reason of sub.reasons) {
        out.push({
          categoryId: category.id,
          categoryName: category.name,
          subcategoryId: sub.id,
          subcategoryName: sub.name,
          reasonId: reason.id,
          reasonName: reason.name,
          path: [category.name, sub.name, reason.name].join(REASON_PATH_SEP),
        });
      }
    }
    // Reasons attached directly to the category (no subcategory).
    for (const reason of category.reasons ?? []) {
      out.push({
        categoryId: category.id,
        categoryName: category.name,
        subcategoryId: null,
        subcategoryName: null,
        reasonId: reason.id,
        reasonName: reason.name,
        path: [category.name, reason.name].join(REASON_PATH_SEP),
      });
    }
  }
  return out;
}

/** The resolved names for one mistake reason reference, with graceful fallbacks for deleted ids. */
export interface ResolvedReason {
  categoryName: string | null;
  subcategoryName: string | null;
  reasonName: string | null;
  /** A single display label built from whatever depth resolved, or "(deleted reason)". */
  label: string;
}

/** Resolve a mistake's reason reference against the live taxonomy for display and grouping. */
export function resolveReasonRef(
  categories: DrillReasonCategory[],
  ref: DrillMistakeReasonRef,
): ResolvedReason {
  const category = categories.find(c => c.id === ref.categoryId) ?? null;
  const sub = ref.subcategoryId
    ? (category?.subcategories ?? []).find(s => s.id === ref.subcategoryId) ?? null
    : null;
  // A reason lives in its subcategory, or (when there's no subcategory) directly on the category.
  const reasonPool = sub ? sub.reasons : (category?.reasons ?? []);
  const reason = ref.reasonId
    ? reasonPool.find(r => r.id === ref.reasonId) ?? null
    : null;

  const categoryName = category?.name ?? null;
  const subcategoryName = sub?.name ?? null;
  const reasonName = reason?.name ?? null;

  const parts = [categoryName, subcategoryName, reasonName].filter(
    (p): p is string => p !== null,
  );
  // How many levels the ref names — if fewer resolved, something upstream was deleted.
  const wantedDepth = 1 + (ref.subcategoryId ? 1 : 0) + (ref.reasonId ? 1 : 0);
  const label = parts.length === 0 || parts.length < wantedDepth
    ? parts.length === 0
      ? "(deleted reason)"
      : `${parts.join(REASON_PATH_SEP)}${REASON_PATH_SEP}(deleted)`
    : parts.join(REASON_PATH_SEP);

  return {
    categoryName,
    subcategoryName,
    reasonName,
    label,
  };
}

/** Where a new reason should live: a brand-new or existing category, with an optional subcategory. */
export interface ReasonPlacement {
  category: { kind: "new";
    name: string; } | { kind: "existing";
      category: DrillReasonCategory; };
  sub: { kind: "none" } | { kind: "new";
    name: string; } | { kind: "existing";
      id: string; };
}

/** The taxonomy mutation that realises a {@link ReasonPlacement} for one new reason. */
export type PlannedReasonAddition
  = { kind: "create";
    input: CreateDrillReasonCategoryInput;
    subId: string | null; }
    | { kind: "update";
      categoryId: string;
      input: UpdateDrillReasonCategoryInput;
      subId: string | null; };

/**
 * Plan how to add one new reason to the taxonomy: create a whole category (optionally holding a new
 * subcategory), or update an existing category (attach the reason directly, to a new subcategory, or
 * to an existing one). Pure — `makeId` is injected so ids stay deterministic in tests.
 */
export function planReasonAddition(
  placement: ReasonPlacement,
  reason: DrillReason,
  makeId: () => string,
): PlannedReasonAddition {
  if (placement.category.kind === "new") {
    if (placement.sub.kind === "new") {
      const subId = makeId();
      return {
        kind: "create",
        input: {
          name: placement.category.name.trim(),
          subcategories: [{
            id: subId,
            name: placement.sub.name.trim(),
            reasons: [reason],
          }],
        },
        subId,
      };
    }
    return {
      kind: "create",
      input: {
        name: placement.category.name.trim(),
        reasons: [reason],
      },
      subId: null,
    };
  }

  const category = placement.category.category;
  if (placement.sub.kind === "none") {
    // Attach the reason directly to the category (no subcategory).
    return {
      kind: "update",
      categoryId: category.id,
      input: {
        reasons: [...(category.reasons ?? []), reason],
      },
      subId: null,
    };
  }
  const existing: DrillSubcategory[] = category.subcategories ?? [];
  if (placement.sub.kind === "new") {
    const subId = makeId();
    return {
      kind: "update",
      categoryId: category.id,
      input: {
        subcategories: [...existing, {
          id: subId,
          name: placement.sub.name.trim(),
          reasons: [reason],
        }],
      },
      subId,
    };
  }
  const subId = placement.sub.id;
  return {
    kind: "update",
    categoryId: category.id,
    input: {
      subcategories: existing.map(s =>
        s.id === subId
          ? {
            ...s,
            reasons: [...s.reasons, reason],
          }
          : s),
    },
    subId,
  };
}
