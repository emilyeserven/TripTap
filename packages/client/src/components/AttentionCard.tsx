import { Link } from "@tanstack/react-router";
import { InboxIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAttention } from "@/hooks/useAttention";

/**
 * Compact "needs your attention" card for the homepage and Start page: one counts-only row per
 * inbox group, all linking to the full /attention page. Renders nothing while empty.
 */
export function AttentionCard() {
  const {
    groups,
  } = useAttention();
  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link
            to="/attention"
            className="
              flex items-center gap-2
              hover:text-primary
            "
          >
            <InboxIcon className="size-4" />
            Needs your attention
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.map(group => (
          <Link
            key={group.kind}
            to="/attention"
            className="
              flex items-center justify-between gap-2 rounded-md border p-2
              text-sm transition-colors
              hover:bg-accent
            "
          >
            <span className="font-medium">{group.label}</span>
            <Badge variant="secondary">{group.count}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
