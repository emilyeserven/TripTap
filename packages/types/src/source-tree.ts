/**
 * Hierarchy helpers for the source taxonomy.
 *
 * Sources nest to any depth — a magazine holds issues, an issue holds pages, and a page is what a
 * handful of captures actually came from. The nesting is a single `parentId` column, so every
 * question the UI asks of it ("what's the path to this one?", "which sources sit under it?", "would
 * this re-parent make a loop?") is a traversal, and every traversal is written once here rather than
 * re-derived in each route and picker.
 *
 * These are pure functions over the plain list the API already returns, generic over anything with
 * an id/name/parent, so the middleware can run them on DB rows and the client on wire types. Every
 * walk is bounded by a visited set: a cycle in stored data degrades to a truncated path, never a
 * hang.
 */

/** The minimum shape the hierarchy helpers need — satisfied by both `Source` and its DB row. */
export interface SourceLike {
  id: string;
  name: string;
  parentId: string | null;
}

/** One entry of a flattened tree: the source plus how deep it sits (roots are 0). */
export interface SourceTreeEntry<T extends SourceLike> {
  source: T;
  depth: number;
}

/** The separator between tiers in a rendered source path. */
export const SOURCE_PATH_SEPARATOR = " › ";

/** Index a source list by id for repeated lookups. */
function byId<T extends SourceLike>(sources: readonly T[]): Map<string, T> {
  return new Map(sources.map(s => [s.id, s]));
}

/**
 * The chain of sources above `id`, outermost first — `[magazine, issue]` for a page.
 *
 * Returns an empty array for a root, an unknown id, or a source whose parent no longer exists
 * (deleting a parent clears the link rather than cascading, so orphans are expected).
 */
export function sourceAncestors<T extends SourceLike>(
  sources: readonly T[],
  id: string,
): T[] {
  const index = byId(sources);
  const seen = new Set<string>([id]);
  const chain: T[] = [];

  let parentId = index.get(id)?.parentId ?? null;
  while (parentId && !seen.has(parentId)) {
    const parent = index.get(parentId);
    if (!parent) break;
    seen.add(parent.id);
    chain.unshift(parent);
    parentId = parent.parentId;
  }
  return chain;
}

/**
 * The full path to a source as one string, e.g. `"NHK News Web › 2024-06 › p. 12"`.
 *
 * `""` when the id is unknown. Pass `{ includeSelf: false }` for just the ancestors, which is what
 * a row already showing its own name wants.
 */
export function sourcePathLabel<T extends SourceLike>(
  sources: readonly T[],
  id: string,
  {
    includeSelf = true,
  }: { includeSelf?: boolean } = {},
): string {
  const self = sources.find(s => s.id === id);
  if (!self) return "";
  const names = sourceAncestors(sources, id).map(s => s.name);
  if (includeSelf) names.push(self.name);
  return names.join(SOURCE_PATH_SEPARATOR);
}

/** The direct children of `parentId` (`null` for the roots), alphabetically by name. */
export function sourceChildren<T extends SourceLike>(
  sources: readonly T[],
  parentId: string | null,
): T[] {
  const index = byId(sources);
  return sources
    .filter((s) => {
      // A source pointing at a parent that no longer exists is an orphan, and reads as a root.
      const resolved = s.parentId && index.has(s.parentId) ? s.parentId : null;
      return resolved === parentId;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Every source beneath `id`, at any depth, excluding `id` itself.
 *
 * Used for the roll-ups a parent tier needs — "how many captures are under this magazine?" — and
 * for the re-parenting guard below.
 */
export function sourceDescendants<T extends SourceLike>(
  sources: readonly T[],
  id: string,
): T[] {
  const found: T[] = [];
  const seen = new Set<string>([id]);
  const queue = [id];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const child of sourceChildren(sources, current)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      found.push(child);
      queue.push(child.id);
    }
  }
  return found;
}

/** {@link sourceDescendants} plus `id` itself — the set an "including sub-sources" filter matches. */
export function sourceSubtreeIds<T extends SourceLike>(
  sources: readonly T[],
  id: string,
): Set<string> {
  return new Set([id, ...sourceDescendants(sources, id).map(s => s.id)]);
}

/**
 * Depth-first flattening — parents immediately followed by their children, siblings alphabetical.
 *
 * This is the order both the sources list and the picker render in, so an indented `<option>` list
 * and the page below it agree on where everything sits.
 */
export function flattenSourceTree<T extends SourceLike>(
  sources: readonly T[],
): SourceTreeEntry<T>[] {
  const out: SourceTreeEntry<T>[] = [];
  const seen = new Set<string>();

  const walk = (parentId: string | null, depth: number) => {
    for (const source of sourceChildren(sources, parentId)) {
      if (seen.has(source.id)) continue;
      seen.add(source.id);
      out.push({
        source,
        depth,
      });
      walk(source.id, depth + 1);
    }
  };

  walk(null, 0);
  // Anything left out sits in a cycle, which the API rejects but stored data could still hold.
  for (const source of sources) {
    if (!seen.has(source.id)) {
      out.push({
        source,
        depth: 0,
      });
    }
  }
  return out;
}

/**
 * Whether making `parentId` the parent of `id` would close a loop — either self-parenting or
 * pointing at one of the source's own descendants ("file the magazine under its page").
 *
 * The API rejects such an update; the picker uses it to leave those choices out in the first place.
 */
export function wouldCreateSourceCycle<T extends SourceLike>(
  sources: readonly T[],
  id: string,
  parentId: string | null,
): boolean {
  if (!parentId) return false;
  if (parentId === id) return true;
  return sourceDescendants(sources, id).some(s => s.id === parentId);
}
