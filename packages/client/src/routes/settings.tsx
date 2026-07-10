import { createFileRoute } from "@tanstack/react-router";

import { OcrKeysCard } from "@/components/OcrKeysCard";
import { SkillInstallCard } from "@/components/SkillInstallCard";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Cloud OCR credentials and lesson-authoring tools.</p>
      </div>
      <OcrKeysCard />
      <SkillInstallCard />
    </section>
  );
}
