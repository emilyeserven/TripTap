import { useState } from "react";

import { TextSearch } from "lucide-react";

import { ExampleLookupTabs } from "@/components/ExampleLookupTabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * A per-row "find example sentences" affordance for a lesson word note: a popover with the shared
 * Tatoeba/Renshuu lookup ({@link ExampleLookupTabs}) seeded from the row's word — the same lookup a
 * drill mistake offers. Disabled until the row has a word to search.
 */
export function WordExampleLookup({
  word,
}: {
  word: string;
}) {
  const [open, setOpen] = useState(false);
  const query = word.trim();

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Find example sentences"
          disabled={query.length === 0}
        >
          <TextSearch className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-96"
      >
        <ExampleLookupTabs defaultQuery={query} />
      </PopoverContent>
    </Popover>
  );
}
