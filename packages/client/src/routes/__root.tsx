import type { Theme } from "@/stores/displayStore";
import type { QueryClient } from "@tanstack/react-query";

import { useEffect } from "react";

import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { AppSidebar } from "@/components/app-sidebar";
import { DisplayOptions } from "@/components/DisplayOptions";
import { SlideMode } from "@/components/SlideMode";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { resolveTheme, useDisplayStore } from "@/stores/displayStore";
import { usePageTitleStore } from "@/stores/pageTitleStore";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

/** Keep the `.dark` class on <html> in sync with the theme pref, tracking the OS when set to `system`. */
function useThemeSync(theme: Theme) {
  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
    };
    apply();
    if (theme !== "system") {
      return;
    }
    const mql = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    mql?.addEventListener("change", apply);
    return () => mql?.removeEventListener("change", apply);
  }, [theme]);
}

function RootComponent() {
  const theme = useDisplayStore(s => s.theme);
  const textSize = useDisplayStore(s => s.textSize);
  const focusMode = useDisplayStore(s => s.focusMode);
  const superFocus = useDisplayStore(s => s.superFocus);
  const superFocusSpace = useDisplayStore(s => s.superFocusSpace);
  const slideMode = useDisplayStore(s => s.slideMode);
  const containerWidth = useDisplayStore(s => s.containerWidth);
  const pageTitle = usePageTitleStore(s => s.title);

  useThemeSync(theme);

  // Super focus and slide mode both hide the sidebar for a distraction-free / full-screen view.
  const hideSidebar = focusMode || superFocus || slideMode;

  return (
    <SidebarProvider>
      {hideSidebar ? null : <AppSidebar />}
      <SidebarInset>
        <header
          className="
            sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b
            bg-background px-4
          "
        >
          {hideSidebar ? null : <SidebarTrigger className="-ml-1" />}
          <span className="truncate text-lg font-semibold">{pageTitle || "sentence-bank"}</span>
          <div className="ml-auto flex items-center gap-2">
            <DisplayOptions />
          </div>
        </header>
        <div
          data-text-size={textSize}
          data-container-width={containerWidth}
          data-super-focus={superFocus ? "on" : undefined}
          data-super-focus-space={superFocus ? superFocusSpace : undefined}
          data-slide-mode={slideMode ? "on" : undefined}
          className={cn(
            "mx-auto w-full px-4 py-8",
            containerWidth === "wide" ? "max-w-none" : "max-w-6xl",
          )}
        >
          <Outlet />
        </div>
      </SidebarInset>
      <SlideMode />
      <Toaster />
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </SidebarProvider>
  );
}
