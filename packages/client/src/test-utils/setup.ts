import "@testing-library/jest-dom/vitest";

// jsdom implements no layout, so it has no `Element.scrollIntoView`. Radix's Select calls it when
// opening a listbox that already has a selection, to bring the current item into view — so any test
// that opens a Select with a value set throws without this. A no-op is the whole fix: there is
// nothing to scroll in a headless DOM.
// Guarded on `Element` existing at all: the pure-logic suites under `src/lib/` run in the `node`
// environment, where there is no DOM to patch.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    // Intentionally empty — there is nothing to scroll.
  };
}

// jsdom has no `ResizeObserver` either. Radix primitives that measure themselves on mount (Switch's
// thumb, Popover/Tooltip anchors) construct one in a layout effect, so any form that renders them
// throws without it. A no-op observer is enough: nothing ever resizes in a headless DOM.
if (typeof window !== "undefined" && !("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      // Intentionally empty — nothing resizes in a headless DOM.
    }

    unobserve() {
      // Intentionally empty — nothing resizes in a headless DOM.
    }

    disconnect() {
      // Intentionally empty — nothing resizes in a headless DOM.
    }
  };
}
