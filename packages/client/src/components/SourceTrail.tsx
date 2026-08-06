import type { Source } from "@sentence-bank/types";

import { sourceAncestors } from "@sentence-bank/types";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { useSources } from "@/hooks/useSources";
import { cn } from "@/lib/utils";

/** One tier: its name links to the source page, its own URL (if any) opens the thing itself. */
function Tier({
  source,
}: { source: Source }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Link
        to="/sources/$id"
        params={{
          id: source.id,
        }}
        className="hover:underline"
      >
        {source.name}
      </Link>
      {source.url
        ? (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            title={source.url}
            className="
              text-blue-700
              hover:text-blue-800
            "
            aria-label={`Open ${source.name}`}
          >
            <ExternalLink className="size-3.5" />
          </a>
        )
        : null}
    </span>
  );
}

/**
 * The path to a source, tier by tier — `NHK News Web Easy › 2024-06 › p. 12` — with every tier
 * linked to its own page and, when it has one, its own outside link.
 *
 * Shown wherever something is tagged with a source (a capture, a sentence's origin): a capture filed
 * under "p. 12" only means something alongside the magazine and issue it came from, and the link that
 * gets you back to the page itself may live on any tier.
 */
export function SourceTrail({
  sourceId,
  className,
}: {
  sourceId: string | null;
  className?: string;
}) {
  const {
    data: sources,
  } = useSources();
  const all = sources ?? [];
  const source = sourceId ? all.find(s => s.id === sourceId) : null;
  if (!source) return null;

  const trail = [...sourceAncestors(all, source.id), source];
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-1", className)}
    >
      {trail.map((tier, i) => (
        <span
          key={tier.id}
          className="inline-flex items-center gap-1"
        >
          {i > 0 ? <span aria-hidden="true">›</span> : null}
          <Tier source={tier} />
        </span>
      ))}
    </span>
  );
}
