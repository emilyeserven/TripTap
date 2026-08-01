import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The "show your original" switch shared by the correction surfaces (My Sentences, Answer Sheets,
 * My Writing). Deliberately quiet: the corrected sentence is what should be read, and the learner's
 * original is a supporting detail they opt into, so it sits well below the real actions in weight.
 * Callers own the revealed panel, which differs slightly between surfaces.
 */
export function ShowOriginalToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="
        h-auto gap-1 px-0 py-0.5 text-xs font-normal text-muted-foreground
        hover:bg-transparent hover:text-foreground
      "
    >
      {open ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      {open ? "Hide original" : "Show your original"}
    </Button>
  );
}
