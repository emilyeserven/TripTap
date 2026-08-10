import type { BookmarkSectionNode, BookmarkSectionRef } from "@sentence-bank/types";

import { useMemo } from "react";

import { MultiSelect } from "@/components/ui/multi-select";
import { flattenSectionTree } from "@/lib/sections";

/** Display label for a section node: its name, else a type-appropriate fallback from its position. */
function sectionNodeLabel(n: BookmarkSectionNode): string {
  if (n.name) return n.name;
  if (n.type === "timestamp" && n.startValue) return n.startValue;
  if (n.type === "page" && n.startValue) return `p. ${n.startValue}`;
  return n.type;
}

/**
 * A searchable multi-value section picker: the bookmark's whole Sections tree flattened into one list
 * (pre-order, so children follow their parent in table-of-contents order), each offered with a
 * "Parent › Child" breadcrumb label. Check any number of sections at any depth and they attach as
 * chips at once — the multi-value counterpart to the cascading single-value {@link BookmarkSectionSelect}.
 */
export function BookmarkSectionMultiSelect({
  nodes,
  value,
  onChange,
  usedSectionIds,
  ariaLabel = "Sections",
  className,
}: {
  nodes: BookmarkSectionNode[];
  /** The attached sections, in selection order. */
  value: BookmarkSectionRef[];
  onChange: (refs: BookmarkSectionRef[]) => void;
  /** Section ids that already have a question sheet — de-emphasized (dimmed) but still selectable. */
  usedSectionIds?: Set<string>;
  ariaLabel?: string;
  className?: string;
}) {
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  // Pre-order (table-of-contents order), so each section is immediately followed by its descendants.
  const ordered = useMemo(() => flattenSectionTree(nodes), [nodes]);

  /** Build a full reference for a section: its position plus a "Parent › Child" breadcrumb. */
  const buildRef = (id: string): BookmarkSectionRef | null => {
    const node = byId.get(id);
    if (!node) return null;
    const parts: string[] = [];
    const seen = new Set<string>();
    let cur: BookmarkSectionNode | undefined = node;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      parts.unshift(sectionNodeLabel(cur));
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return {
      id: node.id,
      label: parts.join(" › "),
      type: node.type,
      startValue: node.startValue,
      endValue: node.endValue,
    };
  };

  const options = ordered.map(n => ({
    value: n.id,
    // The breadcrumb doubles as the chip label, so a deep section still reads with its parents.
    label: buildRef(n.id)?.label ?? sectionNodeLabel(n),
    ...(usedSectionIds?.has(n.id)
      ? {
        muted: true,
      }
      : {}),
  }));
  // An attached section missing from the current tree (e.g. removed upstream) still needs an option so
  // its chip renders and stays removable — MultiSelect derives badges from the option list.
  const known = new Set(options.map(o => o.value));
  for (const ref of value) {
    if (!known.has(ref.id)) options.push({
      value: ref.id,
      label: ref.label,
    });
  }

  return (
    <MultiSelect
      value={value.map(s => s.id)}
      onChange={(ids) => {
        // Preserve selection order; for an id outside the current tree keep its existing ref so an
        // attached-but-missing section survives toggling something else, rather than silently dropping.
        const existing = new Map(value.map(s => [s.id, s]));
        onChange(
          ids
            .map(id => buildRef(id) ?? existing.get(id) ?? null)
            .filter((r): r is BookmarkSectionRef => r !== null),
        );
      }}
      options={options}
      placeholder="Select sections…"
      searchPlaceholder="Search sections…"
      emptyText="No sections."
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
