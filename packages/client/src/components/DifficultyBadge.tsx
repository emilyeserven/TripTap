import type { WritingPromptDifficulty } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";

/** A writing prompt's difficulty tag as a pill. JLPT levels get the solid badge; the rest are muted. */
export function DifficultyBadge({
  difficulty,
}: {
  difficulty: WritingPromptDifficulty;
}) {
  const isJlpt = difficulty.startsWith("JLPT");
  return <Badge variant={isJlpt ? "default" : "secondary"}>{difficulty}</Badge>;
}
