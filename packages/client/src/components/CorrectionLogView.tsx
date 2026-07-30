import type { CorrectionLog, CorrectionLogEntry } from "@sentence-bank/types";

import { CollocationCardBuilder } from "@/components/CollocationCardBuilder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Relative "N days ago" from an ISO timestamp, for the last-seen line. */
function daysAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function EntryLine({
  entry,
}: { entry: CorrectionLogEntry }) {
  // A non-correction sentence (no fix) shows plain; a real correction shows original → fix.
  if (!entry.corrected) {
    return (
      <li className="text-sm font-medium">{entry.original}</li>
    );
  }
  return (
    <li className="text-sm">
      <span className="line-through decoration-destructive/60">{entry.original}</span>
      <span className="mx-2 text-muted-foreground">→</span>
      <span className="font-medium">{entry.corrected}</span>
    </li>
  );
}

/**
 * The error log: rule-gap groups sorted by frequency (the grouped "bug", not the scattered failures),
 * plus flat collocation and register lists. A group at/over the gate is flagged as having earned a
 * rule group; one strike short shows how close it is.
 */
export function CorrectionLogView({
  log,
}: { log: CorrectionLog }) {
  const empty
    = log.ruleGaps.length === 0
      && log.collocations.length === 0
      && log.registers.length === 0;

  if (empty) {
    return (
      <p className="text-muted-foreground">
        Nothing triaged yet. Corrections you keep will group here by rule tag.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {log.ruleGaps.length > 0
        ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Rule gaps</h2>
            {log.ruleGaps.map(group => (
              <Card key={group.ruleTagKey}>
                <CardHeader className="pb-2">
                  <div
                    className="
                      flex flex-wrap items-center justify-between gap-2
                    "
                  >
                    <CardTitle className="text-base">
                      {group.ruleTagLabel ?? group.ruleTagKey}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {group.occurrenceCount}
                        {group.occurrenceCount === 1 ? " strike" : " strikes"}
                      </Badge>
                      {group.meetsGate
                        ? <Badge>Earned a rule group</Badge>
                        : (
                          <span className="text-xs text-muted-foreground">
                            {log.gate - group.occurrenceCount} more before it earns a group
                          </span>
                        )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last seen {daysAgo(group.lastSeenAt)}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {group.corrections.map(entry => (
                      <EntryLine
                        key={entry.correctionId}
                        entry={entry}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </section>
        )
        : null}

      {log.collocations.length > 0
        ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Collocations</h2>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {log.collocations.map(entry => (
                    <CollocationCardBuilder
                      key={entry.correctionId}
                      entry={entry}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )
        : null}

      {log.registers.length > 0
        ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Register</h2>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-1">
                  {log.registers.map(entry => (
                    <EntryLine
                      key={entry.correctionId}
                      entry={entry}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )
        : null}
    </div>
  );
}
