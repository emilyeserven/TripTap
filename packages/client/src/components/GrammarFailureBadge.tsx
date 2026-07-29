import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useGrammarFailureStats } from "@/hooks/useCorrections";

/** "N days ago" from an ISO timestamp. */
function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/**
 * "You've broken this N times" badge for a grammar note (spec §5). Counts kept rule-gap corrections
 * whose rule tag links to this grammar tag; renders nothing until there's at least one. Links to the
 * error log so the learner sees the failures against the explanation.
 */
export function GrammarFailureBadge({
  tagId,
}: { tagId: string }) {
  const {
    data: stats,
  } = useGrammarFailureStats(tagId);
  if (!stats || stats.count === 0) return null;

  return (
    <Link to="/corrections/log">
      <Badge
        variant="destructive"
        className="gap-1"
        title="Rule-gap corrections tagged to this grammar point"
      >
        <TriangleAlert className="size-3" />
        Broken
        {" "}
        {stats.count}
        {stats.count === 1 ? " time" : " times"}
        {stats.lastSeenAt ? ` · last ${daysAgo(stats.lastSeenAt)}` : ""}
      </Badge>
    </Link>
  );
}
