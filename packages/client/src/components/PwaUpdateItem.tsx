import { RefreshCwIcon } from "lucide-react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePwaStore } from "@/stores/pwaStore";

/**
 * Sidebar-footer control for app updates, rendered just above the Settings link. Normally offers a
 * manual "Check for updates"; once a new service worker is waiting it flips to an emphasized
 * "Update available" that activates the new version and reloads.
 */
export function PwaUpdateItem() {
  const needRefresh = usePwaStore(s => s.needRefresh);
  const checking = usePwaStore(s => s.checking);
  const checkForUpdate = usePwaStore(s => s.checkForUpdate);
  const applyUpdate = usePwaStore(s => s.applyUpdate);

  const title = needRefresh ? "Update available" : "Check for updates";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={title}
        disabled={checking}
        onClick={needRefresh ? applyUpdate : checkForUpdate}
        className={cn(
          needRefresh
          && `
            bg-primary text-primary-foreground
            hover:bg-primary/90 hover:text-primary-foreground
            active:bg-primary/90 active:text-primary-foreground
          `,
        )}
      >
        <RefreshCwIcon className={cn(checking && "animate-spin")} />
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
