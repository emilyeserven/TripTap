import { request } from "./request";

/**
 * The five-method REST surface every CRUD entity exposes.
 *
 * Each `xApi` object spelled these out by hand — same paths, same verbs, same bodies, differing
 * only in the entity name and its types. That's ~35 near-identical blocks across `lib/api/`, and
 * the cost isn't just the lines: a change to how the client talks to the API (a header, an error
 * shape, a retry) has to be made in every one of them or in none.
 *
 * Entities with extra endpoints spread the factory's result and add their own:
 *
 * ```ts
 * export const shadowingSessionsApi = {
 *   ...crudApi<ShadowingSession, CreateInput, UpdateInput>("/shadowing-sessions"),
 *   audioUrl: (id: string) => `${BASE}/shadowing-sessions/${id}/audio`,
 * };
 * ```
 */
export interface CrudApi<T, CreateInput, UpdateInput> {
  list: () => Promise<T[]>;
  get: (id: string) => Promise<T>;
  create: (input: CreateInput) => Promise<T>;
  update: (id: string, input: UpdateInput) => Promise<T>;
  remove: (id: string) => Promise<undefined>;
}

/**
 * Build the standard CRUD client for a collection. `path` is the API path without the `/api`
 * prefix, e.g. `"/listening-sessions"`.
 */
export function crudApi<T, CreateInput, UpdateInput>(
  path: string,
): CrudApi<T, CreateInput, UpdateInput> {
  return {
    list: () => request<T[]>(path),
    get: (id: string) => request<T>(`${path}/${id}`),
    create: (input: CreateInput) =>
      request<T>(path, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateInput) =>
      request<T>(`${path}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) =>
      request<undefined>(`${path}/${id}`, {
        method: "DELETE",
      }),
  };
}
