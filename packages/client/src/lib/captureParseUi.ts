import type { ParseTarget } from "@sentence-bank/types";

/** Full-width field styling shared by the capture parse workspace's inputs. */
export const FIELD_CLASS
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

/** The `{{tag}}` names each parse target understands, in chip order. */
export const TAGS: Record<ParseTarget, string[]> = {
  sentence: ["text", "translation", "source", "page", "tags", "notes", "language"],
  vocab: ["term", "reading", "meaning", "page", "tags", "notes", "language"],
};

/** The one tag an item must fill to be valid, per target. */
export const REQUIRED: Record<ParseTarget, string> = {
  sentence: "text",
  vocab: "term",
};

export const DEFAULT_TEMPLATE: Record<ParseTarget, string> = {
  sentence: "{{text}}\n{{translation}}",
  vocab: "{{term}}\t{{meaning}}",
};

export const DEFAULT_DIVIDER = "---";
