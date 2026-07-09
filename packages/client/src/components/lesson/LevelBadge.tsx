import { Badge } from "@/components/ui/badge";

/** JLPT levels (N1–N5) render as a solid badge; other tags ("travel", "local", ...) as a muted one. */
export function LevelBadge({
  lvl,
}: { lvl: string }) {
  const isJlpt = /^N[1-5]$/.test(lvl);
  return <Badge variant={isJlpt ? "default" : "secondary"}>{lvl}</Badge>;
}
