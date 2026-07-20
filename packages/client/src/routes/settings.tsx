import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { BookmarksTagsCard } from "@/components/BookmarksTagsCard";
import { DictionaryCard } from "@/components/DictionaryCard";
import { MediaStorageCard } from "@/components/MediaStorageCard";
import { OcrKeysCard } from "@/components/OcrKeysCard";
import { RenshuuKeyCard } from "@/components/RenshuuKeyCard";
import { SkillInstallCard } from "@/components/SkillInstallCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: search.tab === "tagging" || search.tab === "tools" ? search.tab : "integrations",
  }),
});

function SettingsPage() {
  usePageTitle("Settings");
  const navigate = useNavigate();
  const {
    tab,
  } = Route.useSearch();
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Cloud OCR credentials, bookmarks tagging, dictionary lookup, and AI-Lesson-authoring tools.
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={next => void navigate({
          to: "/settings",
          search: {
            tab: next,
          },
        })}
      >
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="tagging">Tagging</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>
        <TabsContent
          value="integrations"
          className="space-y-6"
        >
          <OcrKeysCard />
          <RenshuuKeyCard />
          <DictionaryCard />
          <MediaStorageCard />
        </TabsContent>
        <TabsContent
          value="tagging"
          className="space-y-6"
        >
          <BookmarksTagsCard />
        </TabsContent>
        <TabsContent
          value="tools"
          className="space-y-6"
        >
          <SkillInstallCard />
        </TabsContent>
      </Tabs>
    </section>
  );
}
