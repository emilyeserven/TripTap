/**
 * Barrel for the per-domain API modules in `lib/api/`. Import from `@/lib/api` as before; the
 * implementations live in the domain files so no single module carries every feature's surface.
 */
export * from "./api/capture";
export * from "./api/content";
export * from "./api/lessons";
export * from "./api/sessions";
export * from "./api/system";
export * from "./api/writing";
