import type { RuleGroup, RuleGroupStatus } from "@sentence-bank/types";

import { useState } from "react";

import { ContrastGroupForm } from "@/components/ContrastGroupForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeleteRuleGroup, useUpdateRuleGroup } from "@/hooks/useRuleGroups";

const STATUS_VARIANT: Record<RuleGroupStatus, "default" | "secondary" | "outline"> = {
  proposed: "secondary",
  active: "default",
  suspended: "outline",
};

/**
 * One rule group: its status, axis, and contrast table, with authoring actions. A group that's been
 * quiet past the suspension window shows a suspend prompt (spec §6 inv.7); suspend/reactivate is just
 * a status flip on the same group, so a reappearing tag never spawns a duplicate. Delete lives in the
 * edit view only.
 */
export function RuleGroupCard({
  group,
  ruleTagLabel,
  staleForSuspension,
}: {
  group: RuleGroup;
  ruleTagLabel?: string;
  staleForSuspension?: boolean;
}) {
  const update = useUpdateRuleGroup();
  const del = useDeleteRuleGroup();
  const [editing, setEditing] = useState(false);

  function setStatus(status: RuleGroupStatus) {
    update.mutate({
      id: group.id,
      input: {
        status,
      },
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{ruleTagLabel ?? group.ruleTagKey}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[group.status]}>{group.status}</Badge>
            <Badge variant="outline">{group.items.length} pairs</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Axis: {group.axis}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {staleForSuspension && group.status === "active"
          ? (
            <div
              className="
                flex flex-wrap items-center justify-between gap-2 rounded-md
                border border-amber-500/40 bg-amber-500/10 p-2 text-sm
              "
            >
              <span>No activity for a while — suspend this group?</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus("suspended")}
                disabled={update.isPending}
              >
                Suspend
              </Button>
            </div>
          )
          : null}

        {editing
          ? (
            <div className="space-y-3">
              <ContrastGroupForm
                ruleTagKey={group.ruleTagKey}
                ruleTagLabel={ruleTagLabel}
                group={group}
                onSaved={() => setEditing(false)}
                onCancel={() => setEditing(false)}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await del.mutateAsync(group.id);
                }}
                disabled={del.isPending}
              >
                Delete group
              </Button>
            </div>
          )
          : (
            <>
              <ul className="space-y-1 text-sm">
                {group.items.map(pair => (
                  <li key={pair.id}>
                    <span className="font-medium">{pair.a.jp}</span>
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="font-medium">{pair.b.jp}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({pair.options[0]} vs {pair.options[1]})
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
                {group.status === "proposed"
                  ? (
                    <Button
                      size="sm"
                      onClick={() => setStatus("active")}
                      disabled={update.isPending}
                    >
                      Activate
                    </Button>
                  )
                  : null}
                {group.status === "active"
                  ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus("suspended")}
                      disabled={update.isPending}
                    >
                      Suspend
                    </Button>
                  )
                  : null}
                {group.status === "suspended"
                  ? (
                    <Button
                      size="sm"
                      onClick={() => setStatus("active")}
                      disabled={update.isPending}
                    >
                      Reactivate
                    </Button>
                  )
                  : null}
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
}
