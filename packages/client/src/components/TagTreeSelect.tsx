import type { TagTermOption } from "@sentence-bank/types";

import { useMemo } from "react";

import { Combobox } from "@/components/ui/combobox";

/** One rendered level of the chain: the parent whose children it offers, and the current pick. */
interface Level {
  parentId: string | null;
  selected: string;
}

/**
 * A single-value cascading tag picker: a chain of comboboxes drilling down a tag tree. The first
 * combobox offers the children of `rootId`; picking a tag with subtags reveals the next combobox for
 * its children, repeating until a leaf. Any level is a valid stop — `value` is always the **deepest**
 * picked tag. Changing a higher level resets the deeper ones (the new selection has its own subtree).
 */
export function TagTreeSelect({
  nodes,
  rootId,
  value,
  onChange,
  placeholder = "Pick a tag…",
  ariaLabel = "Tag",
  className = "w-full max-w-xs",
}: {
  nodes: TagTermOption[];
  rootId: string | null;
  /** The selected (deepest) tag id, or "" for none. */
  value: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, TagTermOption[]>();
    for (const n of nodes) {
      const key = n.parentId ?? null;
      const list = map.get(key);
      if (list) list.push(n);
      else map.set(key, [n]);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
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
      if ((cur.parentId ?? null) === (rootId ?? null)) break;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return chain;
  }, [value, byId, rootId]);

  // Build the levels to render: children of root, then children of each selected node, while non-empty.
  const levels: Level[] = [];
  let parent: string | null = rootId ?? null;
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
      {levels.map((level, i) => (
        <Combobox
          key={level.parentId ?? `root-${i}`}
          value={level.selected}
          onChange={id => onChange(id, byId.get(id)?.name ?? "")}
          options={(childrenOf.get(level.parentId) ?? []).map(n => ({
            value: n.id,
            label: n.name,
          }))}
          placeholder={i === 0 ? placeholder : "Subtag…"}
          searchPlaceholder="Search…"
          ariaLabel={i === 0 ? ariaLabel : `${ariaLabel} — subtag ${i}`}
          className={className}
        />
      ))}
    </div>
  );
}
