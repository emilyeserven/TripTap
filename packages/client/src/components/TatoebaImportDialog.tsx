import type { CreateSentenceInput, ExampleSentence } from "@sentence-bank/types";

import { SentenceImportDialog } from "@/components/SentenceImportDialog";
import { useExampleSentences } from "@/hooks/useTatoeba";

/**
 * Build a bank sentence from a Tatoeba result. The CC-BY 2.0 FR licence requires attribution, so the
 * source sentence id, owner, and licence are stamped into the sentence's notes and a `tatoeba` tag is
 * added so imported rows stay identifiable.
 */
function toCreateInput(example: ExampleSentence): CreateSentenceInput {
  const credit = example.owner ? `by ${example.owner}` : "unknown author";
  return {
    text: example.text,
    translation: example.translation,
    language: "Japanese",
    tags: "tatoeba",
    notes: `From Tatoeba #${example.id} (${credit}) · ${example.license}`,
  };
}

/**
 * Search Tatoeba for real Japanese example sentences and import the chosen ones straight into the
 * bank ("Sentences"). Unlike {@link TatoebaExamplePicker} — a read-only reference on drill mistakes —
 * this copies sentences into the learner's own bank, so each import keeps a Tatoeba attribution
 * (sentence id + author + licence) in its notes to satisfy CC-BY 2.0 FR.
 */
export function TatoebaImportDialog(props: {
  /** Control the dialog externally (e.g. from a menu item); omit for the built-in trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const search = useExampleSentences();
  return (
    <SentenceImportDialog
      {...props}
      title="Import sentences from Tatoeba"
      description="Search real Japanese example sentences and add the ones you pick to your bank. Each keeps a Tatoeba attribution in its notes (CC-BY 2.0 FR)."
      triggerLabel="Import from Tatoeba"
      searchAriaLabel="Tatoeba search"
      search={search}
      toCreateInput={toCreateInput}
      footer={(
        <p className="text-xs text-muted-foreground">
          Examples from
          {" "}
          <a
            href="https://tatoeba.org"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Tatoeba
          </a>
          {" "}
          · CC-BY 2.0 FR
        </p>
      )}
    />
  );
}
