import type { GrammarItem } from "@sentence-bank/types";

import { GrammarItemRow } from "./GrammarItemRow";

import { Accordion } from "@/components/ui/accordion";

export function GrammarPane({
  grammar,
}: { grammar: GrammarItem[] }) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={grammar[0]?.id}
      className="w-full"
    >
      {grammar.map(g => (
        <GrammarItemRow
          key={g.id}
          grammar={g}
        />
      ))}
    </Accordion>
  );
}
