import { createFileRoute } from "@tanstack/react-router";

import { BookmarksTagsCard } from "@/components/BookmarksTagsCard";
import { OcrKeysCard } from "@/components/OcrKeysCard";
import { SkillInstallCard } from "@/components/SkillInstallCard";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  usePageTitle("Settings");
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Cloud OCR credentials, bookmarks tagging, and lesson-authoring tools.
        </p>
      </div>
      <OcrKeysCard />
      <BookmarksTagsCard />
      <SkillInstallCard />
    </section>
  );
}
