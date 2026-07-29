import { useMemo, useState } from "react";

import { RULE_SUSPENSION_DAYS } from "@sentence-bank/types";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ChunkCardCard } from "@/components/ChunkCardCard";
import { ContrastGroupForm } from "@/components/ContrastGroupForm";
import { RuleGroupCard } from "@/components/RuleGroupCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorrectionLog, useRuleTags } from "@/hooks/useCorrections";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useChunkCards, useRuleGroups } from "@/hooks/useRuleGroups";

export const Route = createFileRoute("/corrections/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  usePageTitle("Rule groups");
  const {
    data: groups,
  } = useRuleGroups();
  const {
    data: log,
  } = useCorrectionLog();
  const {
    data: ruleTags,
  } = useRuleTags();
  const {
    data: chunkCards,
  } = useChunkCards();
  const [buildingKey, setBuildingKey] = useState<string | null>(null);

  const labelByKey = useMemo(
    () => new Map((ruleTags ?? []).map(t => [t.key, t.label])),
    [ruleTags],
  );
  const lastSeenByKey = useMemo(
    () => new Map((log?.ruleGaps ?? []).map(g => [g.ruleTagKey, g.lastSeenAt])),
    [log],
  );
  const existingKeys = useMemo(
    () => new Set((groups ?? []).map(g => g.ruleTagKey)),
    [groups],
  );

  // Rule tags that hit the recurrence gate but don't have a group yet — ready to build (spec §6 inv.1).
  const buildReady = (log?.ruleGaps ?? []).filter(g => g.meetsGate && !existingKeys.has(g.ruleTagKey));

  function isStale(ruleTagKey: string): boolean {
    const lastSeen = lastSeenByKey.get(ruleTagKey);
    if (!lastSeen) return true;
    const days = (Date.now() - new Date(lastSeen).getTime()) / 86_400_000;
    return days > RULE_SUSPENSION_DAYS;
  }

  const sorted = [...(groups ?? [])].sort((a, b) => {
    const order = {
      proposed: 0,
      active: 1,
      suspended: 2,
    } as const;
    return order[a.status] - order[b.status];
  });

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/corrections">
          <ArrowLeft className="size-4" />
          Inbox
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        A rule tag that recurs past the gate earns a group: 4–6 minimal-contrast pairs teaching one
        boundary. Build it, then export the group to Anki — Anki handles the review and buries siblings.
      </p>

      {buildReady.length > 0
        ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Ready to build</h2>
            {buildReady.map(g => (
              <Card key={g.ruleTagKey}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {labelByKey.get(g.ruleTagKey) ?? g.ruleTagKey}
                    </CardTitle>
                    {buildingKey === g.ruleTagKey
                      ? null
                      : (
                        <Button
                          size="sm"
                          onClick={() => setBuildingKey(g.ruleTagKey)}
                        >
                          Build a rule group
                        </Button>
                      )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {g.occurrenceCount} strikes
                  </p>
                </CardHeader>
                {buildingKey === g.ruleTagKey
                  ? (
                    <CardContent>
                      <ContrastGroupForm
                        ruleTagKey={g.ruleTagKey}
                        ruleTagLabel={labelByKey.get(g.ruleTagKey)}
                        seedCorrectionIds={g.corrections.map(c => c.correctionId)}
                        onSaved={() => setBuildingKey(null)}
                        onCancel={() => setBuildingKey(null)}
                      />
                    </CardContent>
                  )
                  : null}
              </Card>
            ))}
          </section>
        )
        : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Groups</h2>
        {sorted.length === 0
          ? (
            <p className="text-muted-foreground">
              No groups yet. Once a rule tag recurs past the gate, build its group here.
            </p>
          )
          : null}
        {sorted.map(group => (
          <RuleGroupCard
            key={group.id}
            group={group}
            ruleTagLabel={labelByKey.get(group.ruleTagKey)}
            staleForSuspension={isStale(group.ruleTagKey)}
          />
        ))}
      </section>

      {(chunkCards ?? []).length > 0
        ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Chunk cards</h2>
            {(chunkCards ?? []).map(card => (
              <ChunkCardCard
                key={card.id}
                card={card}
              />
            ))}
          </section>
        )
        : null}
    </section>
  );
}
