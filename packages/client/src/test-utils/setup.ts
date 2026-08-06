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
