import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

/**
 * Render a component that reaches the API through react-query hooks.
 *
 * Retries are off so a failing query surfaces immediately instead of stalling the test, and each call
 * gets a fresh client so cached data can't leak between cases.
 */
export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
