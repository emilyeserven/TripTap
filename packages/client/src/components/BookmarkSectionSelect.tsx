import type { BookmarkSectionNode, BookmarkSectionRef } from "@sentence-bank/types";

import { useMemo } from "react";

import { Combobox } from "@/components/ui/combobox";

/** One rendered level of the chain: the parent whose children it offers, and the current pick. */
interface Level {
  parentId: string | null;
  selected: string;
}

/** Display label for a section node: its name, else a type-appropriate fallback from its position. */
function sectionNodeLabel(n: BookmarkSectionNode): string {
  if (n.name) return n.name;
  if (n.type === "timestamp" && n.startValue) return n.startValue;
  if (n.type === "page" && n.startValue) return `p. ${n.startValue}`;
  return n.type;
}

/**
 * A single-value cascading section picker: a chain of comboboxes drilling down a bookmark's Sections
 * tree. The first combobox offers the top-level sections; picking a section with children reveals the
 * next combobox for its children, repeating until a leaf. Any level is a valid stop — `value` is always
 * the **deepest** picked section. Changing a higher level resets the deeper ones. Picking "Whole
 * bookmark" clears the reference. Ported from the removed grammar-tag `TagTreeSelect`, but preserves the
 * upstream (TOC) order rather than sorting, and emits a full {@link BookmarkSectionRef}.
 */
export function BookmarkSectionSelect({
  nodes,
  value,
  onChange,
  ariaLabel = "Section",
  className = "w-full max-w-xs",
}: {
  nodes: BookmarkSectionNode[];
  /** The selected (deepest) section id, or "" for none. */
  value: string;
  onChange: (ref: BookmarkSectionRef | null) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const childrenOf = useMemo(() => {
    // Preserve upstream order (a table of contents is ordered, not alphabetical).
    const map = new Map<string | null, BookmarkSectionNode[]>();
    for (const n of nodes) {
      const key = n.parentId ?? null;
      const list = map.get(key);
      if (list) list.push(n);
      else map.set(key, [n]);
    }
    return map;
  }, [nodes]);

  // Ancestor path (root → value), so each level shows the picked ancestor. Guards against cycles.
  const path = useMemo(() => {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur = value ? byId.get(value) : undefined;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.unshift(cur.id);
      if ((cur.parentId ?? null) === null) break;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return chain;
  }, [value, byId]);

  /** Build a full reference for a picked section: its position plus a "Parent › Child" breadcrumb. */
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

  // Build the levels to render: children of root, then children of each selected node, while non-empty.
  const levels: Level[] = [];
  let parent: string | null = null;
  for (let i = 0; ; i += 1) {
    const opts = childrenOf.get(parent) ?? [];
    if (opts.length === 0) break; // parent is a leaf → stop chaining
    const selected = path[i] ?? "";
    levels.push({
      parentId: parent,
      selected,
    });
    if (!selected) break; // nothing picked at this level yet → don't reveal deeper
    parent = selected;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((level, i) => {
        const options = (childrenOf.get(level.parentId) ?? []).map(n => ({
          value: n.id,
          label: sectionNodeLabel(n),
        }));
        // The top level can clear back to the whole bookmark; deeper levels reset via a higher change.
        if (i === 0) options.unshift({
          value: "",
          label: "Whole bookmark (no section)",
        });
        return (
          <Combobox
            key={level.parentId ?? `root-${i}`}
            value={level.selected}
            onChange={id => onChange(id ? buildRef(id) : null)}
            options={options}
            placeholder={i === 0 ? "Whole bookmark" : "Sub-section…"}
            searchPlaceholder="Search sections…"
            ariaLabel={i === 0 ? ariaLabel : `${ariaLabel} — sub-section ${i}`}
            className={className}
          />
        );
      })}
    </div>
  );
}
