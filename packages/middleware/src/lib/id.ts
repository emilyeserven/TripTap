import { randomUUID } from "node:crypto";

/** Generate a random UUID for client-side/pre-insert identifiers (candidate ids, object-storage keys). */
export function newId(): string {
  return randomUUID();
}
