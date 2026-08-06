import type { RenshuuExampleSentence, SentenceDraft } from "@sentence-bank/types";

import { SentenceImportDialog } from "@/components/SentenceImportDialog";
import { useRenshuuExamples } from "@/hooks/useRenshuu";

/**
 * Build a draft from a Renshuu result. The text is already normalized toward the common written
 * form server-side; the `renshuu` tag plus a source note keep imported rows identifiable — both
 * bank-only columns, so the picker warns when another destination is chosen.
 */
function toDraft(example: RenshuuExampleSentence): SentenceDraft {
  return {
    text: example.text,
    translation: example.translation,
    language: "Japanese",
    tags: "renshuu",
    provenanceNote: `From Renshuu #${example.id}`,
  };
}

/**
 * Search Renshuu's example-sentence bank (using the learner's stored API key) and import the chosen
 * sentences to the destination they pick. The server-generated furigana previews here; the
 * destination regenerates it (with vocab overrides) on import. Parallels
 * {@link ./TatoebaImportDialog}.
 */
export function RenshuuImportDialog(props: {
  /** Control the dialog externally (e.g. from a menu item); omit for the built-in trigger button. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const search = useRenshuuExamples();
  return (
    <SentenceImportDialog
      {...props}
      title="Import sentences from Renshuu"
      description="Search Renshuu’s example sentences and add the ones you pick. Uncommon kanji are normalized to the usual spelling and furigana is generated."
      triggerLabel="Import from Renshuu"
      searchAriaLabel="Renshuu search"
      search={search}
      toDraft={toDraft}
      footer={(
        <p className="text-xs text-muted-foreground">
          Examples from
          {" "}
          <a
            href="https://www.renshuu.org"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Renshuu
          </a>
        </p>
      )}
    />
  );
}
