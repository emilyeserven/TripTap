import { useCallback, useEffect, useRef, useState } from "react";

import { useLocation } from "@tanstack/react-router";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDisplayStore } from "@/stores/displayStore";

/**
 * Collect the slide panels: each direct child of the slide-mode form is a panel, except multi-column
 * grids / wrapping rows (which the CSS stacks) whose children become panels. Mirrors the panel CSS in
 * index.css so navigation lines up with what the user sees.
 */
function collectPanels(): HTMLElement[] {
  const form = document.querySelector<HTMLElement>("[data-slide-mode=\"on\"] form");
  if (!form) {
    return [];
  }
  const panels: HTMLElement[] = [];
  for (const child of Array.from(form.children)) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    if (child.matches("[class*=\"grid-cols\"], .flex-wrap")) {
      for (const grandchild of Array.from(child.children)) {
        if (grandchild instanceof HTMLElement) {
          panels.push(grandchild);
        }
      }
    }
    else {
      panels.push(child);
    }
  }
  return panels;
}

function focusFirstField(panel: HTMLElement) {
  const focusable = panel.querySelector<HTMLElement>(
    "input, textarea, select, button, [tabindex]:not([tabindex=\"-1\"])",
  );
  focusable?.focus({
    preventScroll: true,
  });
}

/**
 * Drives slide mode: full-screen field panels with scroll snapping, Tab/arrow-key navigation, clickable
 * prev/next arrows, and an optional bottom progress indicator (line or boxes). Mounted once globally and
 * inert unless slide mode is on. The document is the scroller, so snapping is toggled via a `slide-mode`
 * class on <html> (see index.css); this component renders the navigation overlay.
 */
export function SlideMode() {
  const slideMode = useDisplayStore(s => s.slideMode);
  const slideProgress = useDisplayStore(s => s.slideProgress);
  const {
    pathname,
  } = useLocation();

  const panelsRef = useRef<HTMLElement[]>([]);
  const currentRef = useRef(0);
  const [count, setCount] = useState(0);
  const [current, setCurrent] = useState(0);

  const go = useCallback((delta: number) => {
    const panels = panelsRef.current;
    if (panels.length === 0) {
      return;
    }
    const next = Math.min(panels.length - 1, Math.max(0, currentRef.current + delta));
    const panel = panels[next];
    panel.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    focusFirstField(panel);
    currentRef.current = next;
    setCurrent(next);
  }, []);

  // Toggle the html-level scroll-snap container while slide mode is on.
  useEffect(() => {
    document.documentElement.classList.toggle("slide-mode", slideMode);
    return () => {
      document.documentElement.classList.remove("slide-mode");
    };
  }, [slideMode]);

  // Enumerate panels + wire up navigation whenever slide mode or the route changes.
  useEffect(() => {
    if (!slideMode) {
      panelsRef.current = [];
      setCount(0);
      return;
    }
    const wrapper = document.querySelector<HTMLElement>("[data-slide-mode=\"on\"]");
    if (!wrapper) {
      return;
    }

    const ratios = new Map<Element, number>();
    const observer
      = "IntersectionObserver" in globalThis
        ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              ratios.set(entry.target, entry.intersectionRatio);
            }
            let best = 0;
            let bestRatio = -1;
            panelsRef.current.forEach((panel, index) => {
              const ratio = ratios.get(panel) ?? 0;
              if (ratio > bestRatio) {
                bestRatio = ratio;
                best = index;
              }
            });
            currentRef.current = best;
            setCurrent(best);
          },
          {
            threshold: [0, 0.25, 0.5, 0.75, 1],
          },
        )
        : null;

    const refresh = () => {
      const panels = collectPanels();
      panelsRef.current = panels;
      setCount(panels.length);
      if (observer) {
        observer.disconnect();
        ratios.clear();
        for (const panel of panels) {
          observer.observe(panel);
        }
      }
    };
    refresh();

    // Forms often render after their data loads; re-enumerate when the subtree changes.
    const mutationObserver = new MutationObserver(refresh);
    mutationObserver.observe(wrapper, {
      childList: true,
      subtree: true,
    });

    // Tab (and clicks) move focus between fields; scroll the focused field's panel into view.
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      const index = panelsRef.current.findIndex(panel => target != null && panel.contains(target));
      if (index >= 0) {
        panelsRef.current[index].scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        currentRef.current = index;
        setCurrent(index);
      }
    };
    wrapper.addEventListener("focusin", onFocusIn);

    const onKeyDown = (event: KeyboardEvent) => {
      // Don't hijack arrows while composing (IME candidate selection) or while typing in a field —
      // otherwise picking a kanji / moving the caret jarringly jumps slides. The chevron buttons stay.
      if (event.isComposing) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=\"true\"]")) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        go(1);
      }
      else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
      wrapper.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [slideMode, pathname, go]);

  if (!slideMode || count === 0) {
    return null;
  }

  return (
    <>
      {slideProgress === "line" && (
        <div className="fixed inset-x-0 bottom-0 z-50 h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{
              width: `${((current + 1) / count) * 100}%`,
            }}
          />
        </div>
      )}

      {slideProgress === "boxes" && (
        <div
          className="fixed inset-x-0 bottom-4 z-50 flex justify-center gap-1.5"
        >
          {Array.from({
            length: count,
          }).map((_, index) => (
            <span

              key={index}
              className={cn(
                "size-2.5 rounded-sm border",
                index <= current ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      )}

      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Previous field"
          disabled={current === 0}
          onClick={() => go(-1)}
        >
          <ChevronUpIcon />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Next field"
          disabled={current >= count - 1}
          onClick={() => go(1)}
        >
          <ChevronDownIcon />
        </Button>
      </div>
    </>
  );
}
