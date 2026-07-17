import type { ParseResult } from "@/lib/parseTemplate";
import type {
  CreateSentenceInput,
  CreateVocabInput,
  ParseBoundary,
  ParseTarget,
} from "@sentence-bank/types";

import { REQUIRED } from "@/lib/captureParseUi";
import { parseTemplate, splitOnDivider } from "@/lib/parseTemplate";

/** Workspace mode: create sentences, vocab, or both at once from a divider-split text. */
export type ParseMode = ParseTarget | "merged";

/** The shared batch values applied to every item; a matching per-item `{{tag}}` overrides them. */
export interface SharedCaptureValues {
  captureId: string;
  sourceId: string | null;
  page: string;
  language: string;
  tags: string;
  notes: string;
}

/** Prefer a per-item tag value, else the batch/shared value, else empty. */
export function pick(itemValue: string | undefined, shared: string): string {
  return (itemValue && itemValue.trim()) || shared.trim();
}

/**
 * Parse the working text for the active mode. In "merged" mode the text is split on the divider
 * into a sentence section (above) and a vocab section (below); single-target modes parse the whole
 * text and leave the other section undefined.
 */
export function parseForMode(opts: {
  mode: ParseMode;
  workingText: string;
  divider: string;
  sentenceTemplate: string;
  vocabTemplate: string;
  boundary: ParseBoundary;
  ignoreBlankLines: boolean;
}): { sentence?: ParseResult;
  vocab?: ParseResult; } {
  const shared = {
    boundary: opts.boundary,
    ignoreBlankLines: opts.ignoreBlankLines,
  };
  if (opts.mode === "merged") {
    const [sentenceText, vocabText] = splitOnDivider(opts.workingText, opts.divider);
    return {
      sentence: parseTemplate(sentenceText, opts.sentenceTemplate, {
        ...shared,
        requiredField: REQUIRED.sentence,
      }),
      vocab: parseTemplate(vocabText, opts.vocabTemplate, {
        ...shared,
        requiredField: REQUIRED.vocab,
      }),
    };
  }
  if (opts.mode === "sentence") {
    return {
      sentence: parseTemplate(opts.workingText, opts.sentenceTemplate, {
        ...shared,
        requiredField: REQUIRED.sentence,
      }),
    };
  }
  return {
    vocab: parseTemplate(opts.workingText, opts.vocabTemplate, {
      ...shared,
      requiredField: REQUIRED.vocab,
    }),
  };
}

/** Turn a parsed sentence section into create inputs, carrying shared metadata + vocab links. */
export function buildSentenceInputs(
  result: ParseResult,
  shared: SharedCaptureValues,
  linksFor: (index: number, text: string) => string[],
): CreateSentenceInput[] {
  return result.items
    .map((item, index) => ({
      item,
      index,
    }))
    .filter(({
      item,
    }) => item.valid)
    .map(({
      item, index,
    }) => ({
      text: item.fields.text,
      translation: (item.fields.translation ?? "").trim() || null,
      language: pick(item.fields.language, shared.language) || "Japanese",
      source: (item.fields.source ?? "").trim() || null,
      sourceId: shared.sourceId,
      page: pick(item.fields.page, shared.page) || null,
      tags: pick(item.fields.tags, shared.tags) || null,
      notes: pick(item.fields.notes, shared.notes) || null,
      captureId: shared.captureId,
      vocabIds: linksFor(index, item.fields.text),
    }));
}

/** Turn a parsed vocab section into create inputs, carrying shared metadata. */
export function buildVocabInputs(
  result: ParseResult,
  shared: SharedCaptureValues,
): CreateVocabInput[] {
  return result.items
    .filter(item => item.valid)
    .map(item => ({
      term: item.fields.term,
      reading: (item.fields.reading ?? "").trim() || null,
      meaning: (item.fields.meaning ?? "").trim() || null,
      language: pick(item.fields.language, shared.language) || "Japanese",
      sourceId: shared.sourceId,
      page: pick(item.fields.page, shared.page) || null,
      tags: pick(item.fields.tags, shared.tags) || null,
      notes: pick(item.fields.notes, shared.notes) || null,
      captureId: shared.captureId,
    }));
}
