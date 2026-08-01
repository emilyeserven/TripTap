import type { MySentence } from "@sentence-bank/types";

import { GrammarTagsEditor } from "@/components/GrammarTagsEditor";
import { useUpdateMySentence } from "@/hooks/useMySentences";
import { replaceCategory, termCategory } from "@/lib/terms";

/**
 * Both of a My Sentence's Grammar-source tag lists, editable in place: the neutral grammar tags
 * (stored among `terms`) and the ones it used **incorrectly** (`incorrectGrammarTerms`, which
 * surfaces on the grammar note under "Used incorrectly here"). Tagging tends to happen in a pass
 * over the whole list, so both are offered on the card rather than only on the sentence's edit page.
 */
export function MySentenceGrammarTags({
  mySentence: ms,
}: {
  mySentence: MySentence;
}) {
  const update = useUpdateMySentence();
  const grammarTerms = (ms.terms ?? []).filter(t => termCategory(t) === "grammar");

  return (
    <div className="space-y-1">
      <GrammarTagsEditor
        value={grammarTerms}
        isPending={update.isPending}
        onSave={next => update.mutate({
          id: ms.id,
          input: {
            // The other channels live in the same column and must survive a grammar-only edit.
            terms: replaceCategory(ms.terms, "grammar", next),
          },
        })}
      />
      <GrammarTagsEditor
        label="Grammar used incorrectly"
        addLabel="Flag grammar used incorrectly"
        value={ms.incorrectGrammarTerms}
        isPending={update.isPending}
        onSave={next => update.mutate({
          id: ms.id,
          input: {
            incorrectGrammarTerms: next,
          },
        })}
      />
    </div>
  );
}
