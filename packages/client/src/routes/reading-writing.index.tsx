import { useMemo } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { HubSection } from "@/components/HubSection";
import { ResourceRow } from "@/components/ResourceRow";
import { useBookmarkResources } from "@/hooks/useBookmarks";
import { useMySentences } from "@/hooks/useMySentences";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useReadingSessions } from "@/hooks/useReadingSessions";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { useWritings } from "@/hooks/useWritings";
import { resourceLearningAreas } from "@/lib/collections";

export const Route = createFileRoute("/reading-writing/")({
  component: ReadingWritingPage,
});

const PREVIEW_LIMIT = 6;
const VIEW_ALL_CLASS = "text-sm font-medium text-primary hover:underline";

function ReadingWritingPage() {
  usePageTitle("Reading & Writing");
  const resources = useBookmarkResources();
  const settings = useBookmarksSettings();
  const writings = useWritings();
  const sentences = useMySentences();
  const readingSessions = useReadingSessions();

  const areaTags = useMemo(() => settings.data?.learningAreaTags ?? {}, [settings.data]);
  const rowResources = useMemo(
    () => (resources.data?.resources ?? []).filter((r) => {
      const areas = resourceLearningAreas(r.tagIds, areaTags);
      return areas.includes("Reading") || areas.includes("Writing");
    }),
    [resources.data, areaTags],
  );

  const writingViewAll = (
    <Link
      to="/my-writing"
      className={VIEW_ALL_CLASS}
    >
      View all →
    </Link>
  );
  const sentencesViewAll = (
    <Link
      to="/my-sentences"
      className={VIEW_ALL_CLASS}
    >
      View all →
    </Link>
  );
  const readingViewAll = (
    <Link
      to="/reading-sessions"
      className={VIEW_ALL_CLASS}
    >
      View all →
    </Link>
  );

  return (
    <section className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Reading &amp; Writing</h1>
        <p className="text-sm text-muted-foreground">
          Resources tagged Reading or Writing, plus your writing, sentences, and reading sessions.
        </p>
      </div>

      <HubSection title="Resources">
        <ResourceRow
          resources={rowResources}
          areaTags={areaTags}
          emptyText="No resources tagged Reading or Writing yet."
        />
      </HubSection>

      <HubSection
        title="My Writing"
        action={writingViewAll}
      >
        {(writings.data ?? []).length === 0
          ? <p className="text-sm text-muted-foreground">No writing yet.</p>
          : (
            <ul className="space-y-1.5">
              {(writings.data ?? []).slice(0, PREVIEW_LIMIT).map(w => (
                <li key={w.id}>
                  <Link
                    to="/my-writing/$id"
                    params={{
                      id: w.id,
                    }}
                    className="
                      block truncate text-sm
                      hover:underline
                    "
                  >
                    {w.text.trim() || w.promptTitle || "(untitled)"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </HubSection>

      <HubSection
        title="My Sentences"
        action={sentencesViewAll}
      >
        {(sentences.data ?? []).length === 0
          ? <p className="text-sm text-muted-foreground">No sentences yet.</p>
          : (
            <ul className="space-y-1.5">
              {(sentences.data ?? []).slice(0, PREVIEW_LIMIT).map(s => (
                <li key={s.id}>
                  <Link
                    to="/my-sentences/$id"
                    params={{
                      id: s.id,
                    }}
                    className="
                      block truncate text-sm
                      hover:underline
                    "
                  >
                    {s.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </HubSection>

      <HubSection
        title="Reading Sessions"
        action={readingViewAll}
      >
        {(readingSessions.data ?? []).length === 0
          ? <p className="text-sm text-muted-foreground">No reading sessions yet.</p>
          : (
            <ul className="space-y-1.5">
              {(readingSessions.data ?? []).slice(0, PREVIEW_LIMIT).map(rs => (
                <li key={rs.id}>
                  <Link
                    to="/reading-sessions/$id"
                    params={{
                      id: rs.id,
                    }}
                    className="
                      block truncate text-sm
                      hover:underline
                    "
                  >
                    {rs.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </HubSection>
    </section>
  );
}
