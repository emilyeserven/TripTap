import type { ReactNode } from "react";

import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useDisplayStore } from "@/stores/displayStore";

export interface LessonSection {
  id: string;
  title: string;
  node: ReactNode;
  /** Header action (an add button, a toggle) — shown in the card header or the tab panel header. */
  action?: ReactNode;
  /** Supporting copy shown under the title. */
  description?: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Renders a lesson's sections either as bordered, collapsible **cards** or as a **tabbed** switcher,
 * per the persisted `lessonSectionLayout` pref — shared by the lesson view and edit pages so the choice
 * (and word-column choice) applies to both. Cards mode returns a fragment so each `Card` is a direct
 * child of the caller's `space-y-6` container (and, on the edit `<form>`, its own slide-mode panel);
 * slide mode therefore forces cards so tabs (which unmount inactive panels) don't collapse to one slide.
 */
export function LessonSections({
  sections,
}: {
  sections: LessonSection[];
}) {
  const layout = useDisplayStore(s => s.lessonSectionLayout);
  const slideMode = useDisplayStore(s => s.slideMode);

  if (layout === "tabs" && !slideMode) {
    return (
      <Tabs defaultValue={sections[0]?.id}>
        <TabsList className="h-auto flex-wrap">
          {sections.map(s => (
            <TabsTrigger
              key={s.id}
              value={s.id}
            >
              {s.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map(s => (
          <TabsContent
            key={s.id}
            value={s.id}
            className="space-y-3"
          >
            {s.action || s.description
              ? (
                <div className="flex items-start justify-between gap-2">
                  {s.description
                    ? <p className="text-xs text-muted-foreground">{s.description}</p>
                    : <span />}
                  {s.action ? <div className="shrink-0">{s.action}</div> : null}
                </div>
              )
              : null}
            {s.node}
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  return (
    <>
      {sections.map(s => (
        <Card key={s.id}>
          <CardContent>
            <CollapsibleSection
              title={s.title}
              description={s.description}
              action={s.action}
              defaultOpen={s.defaultOpen ?? true}
            >
              {s.node}
            </CollapsibleSection>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
