import type { ResourceMediaKind } from "@/lib/collections";

import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { HubSection, VIEW_ALL_CLASS } from "@/components/HubSection";
import { ResourceRow } from "@/components/ResourceRow";
import { Button } from "@/components/ui/button";
import { useBookmarkResources } from "@/hooks/useBookmarks";
import { useDialogues } from "@/hooks/useDialogues";
import { useListeningSessions } from "@/hooks/useListeningSessions";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { useShadowingLists } from "@/hooks/useShadowingLists";
import { useShadowingSessions } from "@/hooks/useShadowingSessions";
import { matchesMediaKind, resourceLearningAreas } from "@/lib/collections";

export const Route = createFileRoute("/speaking-listening/")({
  component: SpeakingListeningPage,
});

const PREVIEW_LIMIT = 6;

const MEDIA_FILTERS: { value: ResourceMediaKind;
  label: string; }[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "video",
    label: "Videos",
  },
  {
    value: "book",
    label: "Books",
  },
];

function SpeakingListeningPage() {
  usePageTitle("Speaking & Listening");
  const resources = useBookmarkResources();
  const settings = useBookmarksSettings();
  const listeningSessions = useListeningSessions();
  const shadowingSessions = useShadowingSessions();
  const shadowingLists = useShadowingLists();
  const dialogues = useDialogues();

  const [mediaKind, setMediaKind] = useState<ResourceMediaKind>("all");

  const areaTags = useMemo(() => settings.data?.learningAreaTags ?? {}, [settings.data]);
  const areaResources = useMemo(
    () => (resources.data?.resources ?? []).filter((r) => {
      const areas = resourceLearningAreas(r.tagIds, areaTags);
      return areas.includes("Listening") || areas.includes("Speaking");
    }),
    [resources.data, areaTags],
  );
  const rowResources = useMemo(
    () => areaResources.filter(r => matchesMediaKind(r, mediaKind)),
    [areaResources, mediaKind],
  );

  const mediaFilter = (
    <div
      className="flex gap-1"
      role="group"
      aria-label="Filter resources by type"
    >
      {MEDIA_FILTERS.map(({
        value, label,
      }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={mediaKind === value ? "default" : "outline"}
          aria-pressed={mediaKind === value}
          onClick={() => setMediaKind(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );

  // "View more" jumps to the full Collections view, pre-filtered to this hub's learning areas.
  const resourcesAction = (
    <div className="flex items-center gap-3">
      {areaResources.length > 0 ? mediaFilter : null}
      <Link
        to="/collections"
        search={{
          areas: ["Listening", "Speaking"],
        }}
        className={VIEW_ALL_CLASS}
      >
        View more →
      </Link>
    </div>
  );

  const listeningViewAll = (
    <Link
      to="/listening-sessions"
      className={VIEW_ALL_CLASS}
    >
      View all →
    </Link>
  );
  const shadowingViewAll = (
    <Link
      to="/shadowing"
      className={VIEW_ALL_CLASS}
    >
      View all →
    </Link>
  );
  const shadowingListsViewAll = (
    <Link
      to="/shadowing-lists"
      className={VIEW_ALL_CLASS}
    >
      View all →
    </Link>
  );
  const dialoguesViewAll = (
    <Link
      to="/dialogues"
      className={VIEW_ALL_CLASS}
    >
      View all →
    </Link>
  );

  return (
    <section className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Speaking &amp; Listening</h1>
        <p className="text-sm text-muted-foreground">
          Resources tagged Listening or Speaking, plus your listening and shadowing sessions,
          shadowing lists, and dialogues.
        </p>
      </div>

      <HubSection
        title="Resources"
        action={resourcesAction}
      >
        <ResourceRow
          resources={rowResources}
          areaTags={areaTags}
          endpointUrl={settings.data?.endpointUrl}
          loading={resources.isLoading}
          emptyText={
            areaResources.length === 0
              ? "No resources tagged Listening or Speaking yet."
              : `No ${mediaKind === "video" ? "videos" : "books"} tagged Listening or Speaking yet.`
          }
        />
      </HubSection>

      <HubSection
        title="Listening Sessions"
        action={listeningViewAll}
      >
        {(listeningSessions.data ?? []).length === 0
          ? <p className="text-sm text-muted-foreground">No listening sessions yet.</p>
          : (
            <ul className="space-y-1.5">
              {(listeningSessions.data ?? []).slice(0, PREVIEW_LIMIT).map(ls => (
                <li key={ls.id}>
                  <Link
                    to="/listening-sessions/$id"
                    params={{
                      id: ls.id,
                    }}
                    className="
                      block truncate text-sm
                      hover:underline
                    "
                  >
                    {ls.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </HubSection>

      <HubSection
        title="Shadowing Practice"
        action={shadowingViewAll}
      >
        {(shadowingSessions.data ?? []).length === 0
          ? <p className="text-sm text-muted-foreground">No shadowing sessions yet.</p>
          : (
            <ul className="space-y-1.5">
              {(shadowingSessions.data ?? []).slice(0, PREVIEW_LIMIT).map(ss => (
                <li key={ss.id}>
                  <Link
                    to="/shadowing/$id"
                    params={{
                      id: ss.id,
                    }}
                    className="
                      block truncate text-sm
                      hover:underline
                    "
                  >
                    {ss.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </HubSection>

      <HubSection
        title="Shadowing Lists"
        action={shadowingListsViewAll}
      >
        {(shadowingLists.data ?? []).length === 0
          ? <p className="text-sm text-muted-foreground">No shadowing lists yet.</p>
          : (
            <ul className="space-y-1.5">
              {(shadowingLists.data ?? []).slice(0, PREVIEW_LIMIT).map(sl => (
                <li key={sl.id}>
                  <Link
                    to="/shadowing-lists/$id"
                    params={{
                      id: sl.id,
                    }}
                    className="
                      block truncate text-sm
                      hover:underline
                    "
                  >
                    {sl.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </HubSection>

      <HubSection
        title="Dialogues"
        action={dialoguesViewAll}
      >
        {(dialogues.data ?? []).length === 0
          ? <p className="text-sm text-muted-foreground">No dialogues yet.</p>
          : (
            <ul className="space-y-1.5">
              {(dialogues.data ?? []).slice(0, PREVIEW_LIMIT).map(d => (
                <li key={d.id}>
                  <Link
                    to="/dialogues/$id"
                    params={{
                      id: d.id,
                    }}
                    className="
                      block truncate text-sm
                      hover:underline
                    "
                  >
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </HubSection>
    </section>
  );
}
