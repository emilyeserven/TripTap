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
 * bulk `createMany` → `seedMany`, `delete` → `invalidate`.
 */
export function useEntityCacheSync(baseKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: baseKey,
    });
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
