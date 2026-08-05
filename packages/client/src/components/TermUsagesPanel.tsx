import type { TermUsage, TermUsageKind } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { useTermUsages } from "@/hooks/useTermUsages";

/**
 * The entities tagged with a grammar term that no view previously joined — practice sentences,
 * writings, and listening/shadowing sessions. Sentences, My Sentences and question sheets are
 * already rendered by the grammar note itself, so they are filtered out here to avoid showing the
 * same row twice.
 *
 * Backed by `/api/terms/:id/usages`, which answers this in one request; the joins the note does
 * client-side are only practical because those lists are already loaded for other reasons.
 */

/** Kinds the grammar note renders itself, from data it already has. */
const ALREADY_SHOWN: ReadonlySet<TermUsageKind> = new Set<TermUsageKind>([
  "sentence",
  "my_sentence",
  "question_sheet",
  "ai_lesson_grammar",
  "ai_lesson_sentence",
]);

/** The kinds this panel renders, in display order, each with its detail route. */
const GROUPS = [
  {
    kind: "practice_sentence",
    label: "Practice sentences",
    to: "/practice/$id",
  },
  {
    kind: "writing",
    label: "Writing",
    to: "/my-writing/$id",
  },
  {
    kind: "listening_session",
    label: "Listening sessions",
    to: "/listening-sessions/$id",
  },
  {
    kind: "shadowing_session",
    label: "Shadowing sessions",
    to: "/shadowing/$id",
  },
] as const satisfies readonly { kind: TermUsageKind;
  label: string;
  to: string; }[];

function UsageRow({
  usage, to,
}: { usage: TermUsage;
  to: (typeof GROUPS)[number]["to"]; }) {
  return (
    <li className="space-y-0.5 border-l-2 pl-3 text-sm">
      <Link
        to={to}
        params={{
          id: usage.id,
        }}
        className="hover:underline"
      >
        <p>{usage.title}</p>
        {usage.subtitle
          ? <p className="text-muted-foreground">{usage.subtitle}</p>
          : null}
      </Link>
    </li>
  );
}

export function TermUsagesPanel({
  termId,
}: { termId: string }) {
  const {
    data,
  } = useTermUsages(termId);

  const extra = (data?.usages ?? []).filter(u => !ALREADY_SHOWN.has(u.kind));
  if (extra.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3
        className="
          text-sm font-semibold tracking-wide text-muted-foreground uppercase
        "
      >
        {`Also used in (${extra.length})`}
      </h3>
      <div className="space-y-3">
        {GROUPS.map((group) => {
          const rows = extra.filter(u => u.kind === group.kind);
          if (rows.length === 0) return null;
          return (
            <div
              key={group.kind}
              className="space-y-1"
            >
              <p className="text-xs text-muted-foreground">{group.label}</p>
              <ul className="space-y-2">
                {rows.map(u => (
                  <UsageRow
                    key={`${u.kind}:${u.id}`}
                    usage={u}
                    to={group.to}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
