import type { CrudApi } from "@/lib/api/crud";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";

/**
 * Build the five standard TanStack Query hooks for a CRUD entity.
 *
 * Thirteen hook modules were the same 65–69 lines with the entity noun swapped: a list query, a
 * by-id query, and create/update/delete mutations that seed or invalidate the cache and toast on
 * failure. The only genuinely per-feature information was the toast copy — and even that had
 * drifted ("Couldn't save the X" vs "Couldn't create the X" for the same operation).
 *
 * Behaviour matches what those hooks did, including {@link useEntityCacheSync}'s seed-on-write:
 * `create`/`update` write the returned record into its by-id cache so a detail view navigated to
 * straight after saving doesn't serve a stale snapshot.
 *
 * An entity needing more (extra list scopes, bulk create, uploads) spreads the result and adds its
 * own hooks; nothing here has to be all-or-nothing.
 */
export function createEntityHooks<T extends { id: string }, CreateInput, UpdateInput>({
  key,
  api,
  label,
  extraInvalidateKeys,
}: {
  /** The query key root, e.g. `["drill-sessions"]`. */
  key: readonly unknown[];
  api: CrudApi<T, CreateInput, UpdateInput>;
  /** The entity as it reads mid-sentence in an error toast, e.g. "drill session". */
  label: string;
  /** Other base keys whose cached data embeds this entity; see {@link useEntityCacheSync}. */
  extraInvalidateKeys?: readonly (readonly unknown[])[];
}) {
  /** Consistent failure copy — one verb per operation, everywhere. */
  const onError = (verb: string) => (err: unknown) =>
    toast.error(`Couldn't ${verb} the ${label}`, {
      description: err instanceof Error ? err.message : undefined,
    });

  // The error generics are explicit on every query and mutation: inside a generic factory
  // TypeScript widens TanStack's default error type to `{}`, which would silently break
  // `error.message` at call sites like TutorPicker's inline create-failure message.
  function useList() {
    // `api` is a fixed module-level binding chosen when these hooks are created, not a varying
    // input; the key identifies the data, and a non-serializable object has no business in a key.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery<T[], Error>({
      queryKey: key,
      queryFn: () => api.list(),
    });
  }

  function useOne(id: string) {
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- see `useList` above.
    return useQuery<T, Error>({
      queryKey: [...key, id],
      queryFn: () => api.get(id),
    });
  }

  function useCreate() {
    const {
      seed,
    } = useEntityCacheSync(key, extraInvalidateKeys);
    return useMutation<T, Error, CreateInput>({
      mutationFn: (input: CreateInput) => api.create(input),
      onSuccess: seed,
      onError: onError("save"),
    });
  }

  function useUpdate() {
    const {
      seed,
    } = useEntityCacheSync(key, extraInvalidateKeys);
    return useMutation<T, Error, { id: string;
      input: UpdateInput; }>({
      mutationFn: ({
        id, input,
      }) => api.update(id, input),
      onSuccess: seed,
      onError: onError("update"),
    });
  }

  function useRemove() {
    const {
      invalidate,
    } = useEntityCacheSync(key, extraInvalidateKeys);
    return useMutation<undefined, Error, string>({
      mutationFn: (id: string) => api.remove(id),
      onSuccess: invalidate,
      onError: onError("delete"),
    });
  }

  return {
    useList,
    useOne,
    useCreate,
    useUpdate,
    useRemove,
  };
}
