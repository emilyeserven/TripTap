import type { IconKey } from "@sentence-bank/types";
import type { LucideIcon } from "lucide-react";

import {
  BookOpen,
  Bus,
  Clapperboard,
  Ghost,
  GraduationCap,
  History,
  Home,
  Landmark,
  MapPin,
  MessageSquare,
  Music,
  ScrollText,
  Sparkles,
  Sun,
  Utensils,
  Waves,
} from "lucide-react";

/** Maps contract icon keys (see `ICON_KEYS` in the types package) to lucide components. */
const ICONS: Record<IconKey, LucideIcon> = {
  "sparkles": Sparkles,
  "home": Home,
  "utensils": Utensils,
  "landmark": Landmark,
  "bus": Bus,
  "waves": Waves,
  "sun": Sun,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  "scroll-text": ScrollText,
  "ghost": Ghost,
  "message-square": MessageSquare,
  "music": Music,
  "history": History,
  "clapperboard": Clapperboard,
  "map-pin": MapPin,
};

export function AiLessonIcon({
  name, className,
}: { name: IconKey;
  className?: string; }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}
