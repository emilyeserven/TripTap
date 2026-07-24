import type {
  BookmarkResource,
  BookmarkSectionNode,
  BookmarkSectionRef,
  DrillTagMap,
} from "@sentence-bank/types";

import { resourceDrillTags } from "./collections";
import { parseStartValue, sessionSearch } from "./start-recommendations";

/** Group section nodes by parent id, preserving array order (or `startValue` order for sequential material). */
function childrenByParent(
  tree: BookmarkSectionNode[],
  sequential: boolean,
): Map<string | null, BookmarkSectionNode[]> {
  const map = new Map<string | null, BookmarkSectionNode[]>();
  for (const node of tree) {
    const key = node.parentId ?? null;
    const list = map.get(key);
    if (list) list.push(node);
    else map.set(key, [node]);
  }
  if (sequential) {
    for (const list of map.values()) {
      list.sort((a, b) =>
        (parseStartValue(a.startValue) ?? Number.POSITIVE_INFINITY)
        - (parseStartValue(b.startValue) ?? Number.POSITIVE_INFINITY));
    }
  }
  return map;
}

/** Pre-order traversal (root → children) of the section tree, cycle-safe. */
function preorder(tree: BookmarkSectionNode[], sequential: boolean): BookmarkSectionNode[] {
  const children = childrenByParent(tree, sequential);
  const out: BookmarkSectionNode[] = [];
  const seen = new Set<string>();
  const visit = (parentId: string | null) => {
    for (const node of children.get(parentId) ?? []) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      out.push(node);
      visit(node.id);
    }
  };
  visit(null);
  return out;
}

/**
 * The next section to work on in a resource's Sections tree: the first **uncompleted leaf** in reading
 * order (a leaf is the actual unit of work), falling back to the first uncompleted node when there are
 * no uncompleted leaves. `sequential` orders siblings by `startValue` (for Sequential Material) rather
 * than upstream array order. Null when every section is completed (or the tree is empty).
 */
export function nextUncompletedSection(
  tree: BookmarkSectionNode[],
  sequential: boolean,
): BookmarkSectionNode | null {
  if (tree.length === 0) return null;
  const ordered = preorder(tree, sequential);
  const hasChildren = new Set(
    tree.map(n => n.parentId).filter((id): id is string => Boolean(id)),
  );
  const isLeaf = (n: BookmarkSectionNode) => !hasChildren.has(n.id);
  return ordered.find(n => !n.completed && isLeaf(n))
    ?? ordered.find(n => !n.completed)
    ?? null;
}

/** Build a stored section reference (id/type/values + a `Parent › Child` breadcrumb) from a tree node. */
export function sectionNodeToRef(
  node: BookmarkSectionNode,
  tree: BookmarkSectionNode[],
): BookmarkSectionRef {
  const byId = new Map(tree.map(n => [n.id, n]));
  const parts: string[] = [];
  const seen = new Set<string>();
  let cur: BookmarkSectionNode | undefined = node;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    parts.unshift(cur.name || cur.type);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return {
    id: node.id,
    label: parts.join(" › "),
    type: node.type,
    startValue: node.startValue,
    endValue: node.endValue,
  };
}

/** What a daily-task card links to, derived live from its resource. */
export interface DailyTaskAction {
  /** "reading-section" = next section; "drill" = new drill; "reading" = whole-resource reading. */
  kind: "reading-section" | "drill" | "reading";
  /** The link/card label (a section breadcrumb, or the resource title). */
  label: string;
  to: string;
  search: Record<string, string>;
}

/**
 * Resolve a daily task's action from its resource (confirmed rules):
 * - has sections with an uncompleted one → a Reading session prefilled with the **next uncompleted
 *   section** ("sections win", even if also Drills-tagged);
 * - else Drills-tagged and section-less → a new **Drill** session for the resource;
 * - else → a whole-resource **Reading** session.
 */
export function resolveDailyTaskAction({
  resource,
  sectionTree,
  drillTags,
  sequential,
}: {
  resource: Pick<BookmarkResource, "id" | "title" | "url" | "tagIds">;
  sectionTree: BookmarkSectionNode[];
  drillTags: DrillTagMap;
  sequential: boolean;
}): DailyTaskAction {
  const next = nextUncompletedSection(sectionTree, sequential);
  if (next) {
    const ref = sectionNodeToRef(next, sectionTree);
    return {
      kind: "reading-section",
      label: ref.label,
      to: "/reading-sessions/new",
      search: sessionSearch("/reading-sessions/new", resource.id, resource.title, resource.url, ref),
    };
  }
  if (sectionTree.length === 0 && resourceDrillTags(resource.tagIds, drillTags).length > 0) {
    return {
      kind: "drill",
      label: `Drill: ${resource.title}`,
      to: "/drill-sessions/new",
      search: {
        bookmarkId: resource.id,
        bookmarkTitle: resource.title,
        ...(resource.url
          ? {
            bookmarkUrl: resource.url,
          }
          : {}),
      },
    };
  }
  return {
    kind: "reading",
    label: resource.title,
    to: "/reading-sessions/new",
    search: sessionSearch("/reading-sessions/new", resource.id, resource.title, resource.url, null),
  };
}
