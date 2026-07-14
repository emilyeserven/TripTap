import { useIsFetching } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

/**
 * Header control (top-right refresh icon) that flushes the TanStack Query cache: every query is
 * marked stale and the ones currently on screen refetch immediately, so freshly-changed server data
 * (e.g. a bookmark that just started matching a picker's filter) shows up without a full page reload.
 * The icon spins while any query is in flight.
 */
export function RefreshButton() {
  const isFetching = useIsFetching();

  const handleRefresh = () => {
    void queryClient.invalidateQueries();
    toast("Refreshing data…");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Refresh data"
      onClick={handleRefresh}
    >
      <RefreshCwIcon className={cn(isFetching > 0 && "animate-spin")} />
    </Button>
  );
}
