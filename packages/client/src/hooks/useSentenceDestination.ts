import type {
  CreateMySentenceInput,
  CreatePracticeSentenceInput,
  CreateSentenceInput,
  SentenceDestination,
  SentenceDraft,
} from "@sentence-bank/types";

import { useCreateMySentencesMany } from "@/hooks/useMySentences";
import { useCreatePracticeSentencesMany } from "@/hooks/usePracticeSentences";
import { useCreateSentencesMany } from "@/hooks/useSentences";

/**
 * Resolve a {@link SentenceDestination} to the mutation that writes it.
 *
 * Entry points used to pick a table by importing one `useCreate…Many` hook, which is why the
 * destination was fixed at the point the *tool* was written rather than at the point the learner
 * decides. This hook is the seam: an entry point produces {@link SentenceDraft}s and names a
 * destination, and everything downstream — input mapping, cache seeding, toasts — is already
 * per-feature and stays where it is.
 *
 * All three mutations are subscribed unconditionally (hooks can't be called in a branch); only the
 * selected one is ever fired.
 */

/** Bank rows keep the full draft — it is the only destination with `tags` and `notes` columns. */
function toBankInput(draft: SentenceDraft): CreateSentenceInput {
  return {
    text: draft.text,
    language: draft.language,
    translation: draft.translation ?? null,
    terms: draft.terms ?? null,
    tags: draft.tags ?? null,
    notes: draft.provenanceNote ?? null,
    sourceId: draft.sourceId ?? null,
    page: draft.page ?? null,
    captureId: draft.captureId ?? null,
  };
}

/**
 * My Sentences is the narrowest table — no source, page, capture link, tags or notes. New rows
 * default to `needsCorrection` server-side, which is the point of sending one here.
 */
function toMineInput(draft: SentenceDraft): CreateMySentenceInput {
  return {
    text: draft.text,
    language: draft.language,
    translation: draft.translation ?? null,
    terms: draft.terms ?? null,
  };
}

/** Practice keeps provenance (it is mined from captures and bank rows) but has no tags or notes. */
function toPracticeInput(draft: SentenceDraft): CreatePracticeSentenceInput {
  return {
    text: draft.text,
    language: draft.language,
    translation: draft.translation ?? null,
    terms: draft.terms ?? null,
    sourceId: draft.sourceId ?? null,
    page: draft.page ?? null,
    captureId: draft.captureId ?? null,
    sentenceId: draft.sentenceId ?? null,
  };
}

export interface SentenceDestinationMutation {
  /** Write every draft to the selected destination. Resolves once the rows exist. */
  createMany: (drafts: SentenceDraft[]) => Promise<void>;
  isPending: boolean;
}

export function useSentenceDestination(
  destination: SentenceDestination,
): SentenceDestinationMutation {
  const bank = useCreateSentencesMany();
  const mine = useCreateMySentencesMany();
  const practice = useCreatePracticeSentencesMany();

  const active = destination === "bank" ? bank : destination === "mine" ? mine : practice;

  return {
    isPending: active.isPending,
    createMany: async (drafts) => {
      if (drafts.length === 0) return;
      if (destination === "bank") await bank.mutateAsync(drafts.map(toBankInput));
      else if (destination === "mine") await mine.mutateAsync(drafts.map(toMineInput));
      else await practice.mutateAsync(drafts.map(toPracticeInput));
    },
  };
}
