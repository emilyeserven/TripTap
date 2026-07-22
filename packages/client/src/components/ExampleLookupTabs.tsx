import { RenshuuExamplePicker } from "@/components/RenshuuExamplePicker";
import { TatoebaExamplePicker } from "@/components/TatoebaExamplePicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * The shared "Find examples" lookup: Tatoeba and Renshuu example-sentence pickers behind two tabs,
 * seeded from a query word. Tatoeba is read-only reference; Renshuu rows can be imported into the
 * sentence bank. Used from a drill mistake and from a lesson word note.
 */
export function ExampleLookupTabs({
  defaultQuery,
}: {
  defaultQuery: string;
}) {
  return (
    <Tabs defaultValue="tatoeba">
      <TabsList>
        <TabsTrigger value="tatoeba">Tatoeba</TabsTrigger>
        <TabsTrigger value="renshuu">Renshuu</TabsTrigger>
      </TabsList>
      <TabsContent value="tatoeba">
        <TatoebaExamplePicker defaultQuery={defaultQuery} />
      </TabsContent>
      <TabsContent value="renshuu">
        <RenshuuExamplePicker defaultQuery={defaultQuery} />
      </TabsContent>
    </Tabs>
  );
}
