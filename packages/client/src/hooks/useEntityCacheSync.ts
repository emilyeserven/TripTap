import { useQueryClient } from "@tanstack/react-query";

/**
 * Keeps caches fresh after an entity mutation. `invalidateQueries` alone only refetches *active*
 * queries, so a detail/list view you navigate to right after saving (inactive at save time) serves a
 * stale snapshot until it eventually refetches (the app caches with a 30s `staleTime`). To fix that,
 * `seed` writes the server's returned record straight into its by-id detail cache — so the detail view
 * shows it immediately, with no extra network — and still invalidates the base key so lists refetch
 * when next viewed.
 *
 * Use in a hook whose entity has a `[...baseKey, id]` detail query: `create`/`update` → `seed`,
 * bulk `createMany` → `seedMany`, `delete` → `invalidate`. Entities with no detail query still use
 * this for `invalidate`, so every hook invalidates the same way.
 *
 * `alsoInvalidate` lists other base keys whose cached data embeds this entity — e.g. a source's name
 * is rendered on sentences, captures and vocab, so saving one must refresh those too.
 */
export function useEntityCacheSync(
  baseKey: readonly unknown[],
  alsoInvalidate: readonly (readonly unknown[])[] = [],
) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    for (const queryKey of [baseKey, ...alsoInvalidate]) {
      queryClient.invalidateQueries({
        queryKey,
      });
    }
  };

  const seed = <T extends { id: string }>(entity: T) => {
    queryClient.setQueryData([...baseKey, entity.id], entity);
    invalidate();
  };

  const seedMany = <T extends { id: string }>(entities: T[]) => {
    for (const entity of entities) {
      queryClient.setQueryData([...baseKey, entity.id], entity);
    }
    invalidate();
  };

  return {
    invalidate,
    seed,
    seedMany,
  };
}
