import type { ComboboxOption } from "@/components/ui/combobox";
import type { TagTermOption } from "@sentence-bank/types";

/**
 * Flatten a tag tree into sectioned combobox options grouped by immediate parent, so the whole
 * hierarchy — subtags included — is pickable from a single dropdown (no drilling). Each tag appears
 * once as a selectable option; its section heading is its parent's name (`rootLabel` for the top
 * level). A parent that has children therefore contributes both a selectable option (under its own
 * parent's section) and a section heading for its children.
 */
export function tagSectionOptions(
  nodes: TagTermOption[],
  rootId: string | null,
  rootLabel: string,
): ComboboxOption[] {
  const childrenOf = new Map<string | null, TagTermOption[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = childrenOf.get(key);
    if (list) list.push(n);
    else childrenOf.set(key, [n]);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const out: ComboboxOption[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, sectionLabel: string) => {
    const children = childrenOf.get(parentId) ?? [];
    for (const c of children) {
      if (seen.has(c.id)) continue; // guard against cycles
      seen.add(c.id);
      out.push({
        value: c.id,
        label: c.name,
        section: sectionLabel,
      });
    }
    // Then descend into each child that has its own children (depth-first, readable ordering).
    for (const c of children) {
      if ((childrenOf.get(c.id) ?? []).length > 0) walk(c.id, c.name);
    }
  };
  walk(rootId ?? null, rootLabel);
  return out;
}
