import type { CreateTripInput, Trip, UpdateTripInput } from "@triptap/types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed with ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const tripsApi = {
  list: () => request<Trip[]>("/trips"),
  create: (input: CreateTripInput) =>
    request<Trip>("/trips", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateTripInput) =>
    request<Trip>(`/trips/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/trips/${id}`, {
    method: "DELETE",
  }),
};
