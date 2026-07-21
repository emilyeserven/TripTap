/** Shared JSON request helper for all API modules. Throws on non-2xx with the server message. */
export const BASE = "/api";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body
        ? {
          "Content-Type": "application/json",
        }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed with ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Multipart file upload (`file` field) to `path`. Deliberately bypasses {@link request}, which
 * hard-codes a JSON content type — the browser sets the multipart boundary itself. Throws on non-2xx
 * with the server message, mirroring {@link request}.
 */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed with ${res.status}`);
  }
  return (await res.json()) as T;
}
