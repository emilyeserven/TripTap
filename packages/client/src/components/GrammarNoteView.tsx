import type { BookmarkSectionMatch, BookmarkSectionRef, GrammarNote } from "@sentence-bank/types";

import { useMemo } from "react";

import { Link } from "@tanstack/react-router";
import { ExternalLink, ImageOff, Plus } from "lucide-react";
import { toast } from "sonner";

import { AiLessonBadge } from "@/components/ai-lesson/AiLessonBadge";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiLessonContent } from "@/hooks/useAiLessons";
import { useBookmarksByTag, useBookmarkSectionsByTag } from "@/hooks/useBookmarks";
import { useGrammarNotes, useUpdateGrammarNote } from "@/hooks/useGrammarNotes";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { useSentences } from "@/hooks/useSentences";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { bookmarkAppUrl } from "@/lib/bookmarks";
import { resourceLearningAreas, resourceMaterialTypes } from "@/lib/collections";
import { sentencesByGrammarTagId } from "@/lib/grammar-links";
import { otherUsages, resolvedRelations, usageLabel } from "@/lib/grammar-notes";
import { buildTaggedSectionTree } from "@/lib/sections";

/** A titled section wrapper — omitted when it has nothing to show. */
function Section({
  title, children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3
        className="
          text-sm font-semibold tracking-wide text-muted-foreground uppercase
        "
      >{title}
      </h3>
      {children}
    </section>
  );
}

/** Read-only view of a grammar note: its write-up plus every sentence, relation, and lesson it links. */
export function GrammarNoteView({
  note,
}: {
  note: GrammarNote;
}) {
  const sentences = useSentences();
  const aiContent = useAiLessonContent();
  const allNotes = useGrammarNotes();
  const questionSheets = useQuestionSheets();
  const update = useUpdateGrammarNote();

  // Auto-gathered: every question sheet tagged with this grammar point.
  const taggedQuestionSheets = useMemo(
    () => (questionSheets.data ?? []).filter(qs =>
      qs.grammarTerms.some(t => t.id === note.tagId)),
    [questionSheets.data, note.tagId],
  );

  // Auto-gathered from the bookmarks app: every bookmark carrying this note's Grammar Source tag.
  const tagBookmarks = useBookmarksByTag(note.tagId);
  // Also auto-gathered: every bookmark *section* whose tags include this note's Grammar Source tag.
  const tagSections = useBookmarkSectionsByTag(note.tagId);
  // Learning-area badges derive a resource's areas from its tags via the Settings mapping.
  const bookmarksSettings = useBookmarksSettings();
  const areaTags = bookmarksSettings.data?.learningAreaTags ?? {};
  const materialTags = bookmarksSettings.data?.materialTypeTags ?? {};
  // Group the tagged sections by their bookmark so each bookmark is one card listing its sections,
  // rather than repeating the bookmark title per section. Upstream order (bookmark title, then section
  // label) is preserved by the insertion-ordered Map.
  const sectionsByBookmark = useMemo(() => {
    const groups = new Map<string, {
      bookmarkId: string;
      bookmarkTitle: string;
      bookmarkUrl: string | null;
      imageUrl: string | null;
      mediaType: string | null;
      tagIds: string[];
      sections: BookmarkSectionRef[];
    }>();
    for (const m of (tagSections.data ?? []) as BookmarkSectionMatch[]) {
      const group = groups.get(m.bookmarkId);
      if (group) group.sections.push(m.section);
      else groups.set(m.bookmarkId, {
        bookmarkId: m.bookmarkId,
        bookmarkTitle: m.bookmarkTitle,
        bookmarkUrl: m.bookmarkUrl,
        imageUrl: m.imageUrl,
        mediaType: m.mediaType,
        tagIds: m.tagIds,
        sections: [m.section],
      });
    }
    return [...groups.values()];
  }, [tagSections.data]);

  const sentenceById = useMemo(
    () => new Map((sentences.data ?? []).map(s => [s.id, s] as const)),
    [sentences.data],
  );

  // Auto-gathered: every bank + AI-lesson sentence carrying this grammar tag.
  const linkedByTag = useMemo(
    () => sentencesByGrammarTagId(sentences.data ?? [], aiContent.data?.sentences ?? []),
    [sentences.data, aiContent.data],
  );
  const taggedSentences = linkedByTag.get(note.tagId) ?? [];

  const usages = useMemo(
    () => otherUsages(allNotes.data ?? [], note),
    [allNotes.data, note],
  );
  const relations = useMemo(
    () => resolvedRelations(allNotes.data ?? [], note),
    [allNotes.data, note],
  );

  // Forward integration: AI-lesson grammar items that carry this grammar tag.
  const aiGrammar = useMemo(
    () =>
      (aiContent.data?.grammar ?? []).filter(g =>
        (g.grammarTerms ?? []).some(t => t.id === note.tagId)),
    [aiContent.data, note.tagId],
  );

  const incorporate = (pat: string, gloss: string, body: string) => {
    const next = [
      ...note.constructions,
      {
        id: crypto.randomUUID(),
        pattern: pat,
        note: [gloss, body].filter(Boolean).join("\n\n") || null,
        sentenceIds: [],
      },
    ];
    update.mutate(
      {
        id: note.id,
        input: {
          constructions: next,
        },
      },
      {
        onSuccess: () => toast.success("Added to note"),
      },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">{note.title}</h2>
        {note.nuance
          ? <p className="mt-1 text-sm text-muted-foreground">{note.nuance}</p>
          : null}
      </div>

      {note.summary
        ? <Markdown content={note.summary} />
        : null}

      {note.constructions.length > 0
        ? (
          <Section title="Constructions">
            <ul className="space-y-4">
              {note.constructions.map(c => (
                <li
                  key={c.id}
                  className="space-y-2 rounded-md border p-3"
                >
                  <p className="font-medium">{c.pattern}</p>
                  {c.note
                    ? (
                      <p
                        className="
                          text-sm whitespace-pre-wrap text-muted-foreground
                        "
                      >{c.note}
                      </p>
                    )
                    : null}
                  {c.sentenceIds.length > 0
                    ? (
                      <ul className="space-y-1.5">
                        {c.sentenceIds.map((id) => {
                          const s = sentenceById.get(id);
                          if (!s) return null;
                          return (
                            <li
                              key={id}
                              className="space-y-0.5 border-l-2 pl-3 text-sm"
                            >
                              <p>{s.text}</p>
                              {s.translation
                                ? <p className="text-muted-foreground">{s.translation}</p>
                                : null}
                            </li>
                          );
                        })}
                      </ul>
                    )
                    : null}
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {taggedSentences.length > 0
        ? (
          <Section title={`Sentences using this grammar (${taggedSentences.length})`}>
            <ul className="space-y-2">
              {taggedSentences.map(s => (
                <li
                  key={s.id}
                  className="space-y-0.5 border-l-2 pl-3 text-sm"
                >
                  <p>{s.text}</p>
                  {s.translation
                    ? <p className="text-muted-foreground">{s.translation}</p>
                    : null}
                  {s.aiLessonTitle
                    ? <p className="text-xs text-muted-foreground">{s.aiLessonTitle}</p>
                    : null}
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {taggedQuestionSheets.length > 0
        ? (
          <Section title={`Question sheets using this grammar (${taggedQuestionSheets.length})`}>
            <ul className="space-y-1.5">
              {taggedQuestionSheets.map(qs => (
                <li
                  key={qs.id}
                  className="text-sm"
                >
                  <Link
                    to="/question-sheets/$id"
                    params={{
                      id: qs.id,
                    }}
                    className="
                      font-medium
                      hover:underline
                    "
                  >
                    {qs.title}
                  </Link>
                  {qs.page
                    ? <span className="text-muted-foreground">{" "}— p. {qs.page}</span>
                    : null}
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {usages.length > 0
        ? (
          <Section title="Other usages of this form">
            <ul className="flex flex-wrap gap-2">
              {usages.map(u => (
                <li key={u.id}>
                  <Link
                    to="/grammar-notes/$id"
                    params={{
                      id: u.id,
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="hover:bg-accent"
                    >
                      {usageLabel(u)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {relations.length > 0
        ? (
          <Section title="Related grammar">
            <ul className="space-y-2">
              {relations.map(r => (
                <li
                  key={r.tagId}
                  className="flex flex-wrap items-baseline gap-2 text-sm"
                >
                  <Badge variant={r.kind === "antonym" ? "destructive" : "secondary"}>
                    {r.kind === "antonym" ? "Antonym" : "Similar"}
                  </Badge>
                  {r.target
                    ? (
                      <Link
                        to="/grammar-notes/$id"
                        params={{
                          id: r.target.id,
                        }}
                        className="
                          font-medium
                          hover:underline
                        "
                      >
                        {usageLabel(r.target)}
                      </Link>
                    )
                    : (
                      <>
                        <span className="font-medium">{r.tagName}</span>
                        <Link
                          to="/grammar-notes/new"
                          search={{
                            tag: r.tagId,
                            name: r.tagName,
                          }}
                          className="
                            text-xs text-muted-foreground
                            hover:underline
                          "
                        >
                          Create note
                        </Link>
                      </>
                    )}
                  {r.note
                    ? <span className="text-muted-foreground">— {r.note}</span>
                    : null}
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {note.resources.length > 0
        ? (
          <Section title="Resources">
            <ul className="space-y-1.5">
              {note.resources.map(r => (
                <li
                  key={r.id}
                  className="text-sm"
                >
                  {r.url
                    ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="
                          font-medium
                          hover:underline
                        "
                      >
                        {r.title}
                      </a>
                    )
                    : <span className="font-medium">{r.title}</span>}
                  {r.section
                    ? <span className="text-muted-foreground">{" "}› {r.section.label}</span>
                    : null}
                  {r.note
                    ? <span className="text-muted-foreground">{" "}— {r.note}</span>
                    : null}
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {aiGrammar.length > 0
        ? (
          <Section title="From your AI lessons">
            <ul className="space-y-4">
              {aiGrammar.map(g => (
                <li
                  key={g.id}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div
                    className="
                      flex flex-wrap items-baseline justify-between gap-2
                    "
                  >
                    <div>
                      <p className="font-medium">{g.pat}</p>
                      <p className="text-sm text-muted-foreground">{g.gloss}</p>
                    </div>
                    <AiLessonBadge
                      slug={g.aiLessonSlug}
                      title={g.aiLessonTitle}
                    />
                  </div>
                  {g.note
                    ? <p className="text-sm whitespace-pre-wrap">{g.note}</p>
                    : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => incorporate(g.pat, g.gloss, g.note)}
                  >
                    <Plus className="size-4" />
                    Add to note
                  </Button>
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {tagBookmarks.data && tagBookmarks.data.length > 0
        ? (
          <Section title={`Bookmarks tagged “${note.tagName}”`}>
            <ul className="space-y-2">
              {tagBookmarks.data.map(b => (
                <li
                  key={b.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <div
                    className="
                      aspect-video h-12 shrink-0 overflow-hidden rounded-sm
                      border bg-muted
                    "
                  >
                    {b.imageUrl
                      ? (
                        <img
                          src={b.imageUrl}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      )
                      : (
                        <div
                          className="flex size-full items-center justify-center"
                        >
                          <ImageOff className="size-4 text-muted-foreground" />
                        </div>
                      )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    {b.url
                      ? (
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noreferrer"
                          className="
                            flex items-center gap-1 font-medium
                            hover:underline
                          "
                        >
                          <span className="truncate">{b.title}</span>
                          <ExternalLink
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                        </a>
                      )
                      : <span className="block truncate font-medium">{b.title}</span>}
                    <div className="flex flex-wrap items-center gap-1">
                      {b.website
                        ? (
                          <Badge variant="secondary">{b.website.siteName}</Badge>
                        )
                        : null}
                      {resourceLearningAreas(b.tagIds, areaTags).map(area => (
                        <Badge
                          key={area}
                          variant="outline"
                        >
                          {area}
                        </Badge>
                      ))}
                      {resourceMaterialTypes(b.tagIds, materialTags).map(type => (
                        <Badge
                          key={type}
                          variant="default"
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}

      {sectionsByBookmark.length > 0
        ? (
          <Section title={`Sections tagged “${note.tagName}”`}>
            <ul
              className="
                grid gap-2
                sm:grid-cols-2
              "
            >
              {sectionsByBookmark.map(group => (
                <li
                  key={group.bookmarkId}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  {group.imageUrl
                    ? (
                      <img
                        src={group.imageUrl}
                        alt=""
                        loading="lazy"
                        className="w-16 shrink-0 self-start rounded-sm border"
                      />
                    )
                    : (
                      <div
                        className="
                          flex aspect-video w-16 shrink-0 items-center
                          justify-center rounded-sm border bg-muted
                        "
                      >
                        <ImageOff className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <a
                      href={bookmarkAppUrl(bookmarksSettings.data?.endpointUrl, group.bookmarkId)}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        flex items-center gap-1 font-medium
                        hover:underline
                      "
                    >
                      <span className="truncate">{group.bookmarkTitle}</span>
                      <ExternalLink
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                    </a>
                    {group.mediaType
                      || resourceLearningAreas(group.tagIds, areaTags).length > 0
                      || resourceMaterialTypes(group.tagIds, materialTags).length > 0
                      ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {group.mediaType ? <Badge variant="outline">{group.mediaType}</Badge> : null}
                          {resourceLearningAreas(group.tagIds, areaTags).map(area => (
                            <Badge
                              key={area}
                              variant="outline"
                            >
                              {area}
                            </Badge>
                          ))}
                          {resourceMaterialTypes(group.tagIds, materialTags).map(type => (
                            <Badge
                              key={type}
                              variant="default"
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      )
                      : null}
                    <ul className="space-y-0.5 text-sm text-muted-foreground">
                      {buildTaggedSectionTree(group.sections).map(node => (
                        <li key={node.section.id}>
                          › {node.label}
                          {node.children.length > 0
                            ? (
                              <ul className="space-y-0.5 pl-4">
                                {node.children.map(child => (
                                  <li key={child.section.id}>{child.label}</li>
                                ))}
                              </ul>
                            )
                            : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )
        : null}
    </div>
  );
}
