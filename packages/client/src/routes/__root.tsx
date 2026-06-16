import type { QueryClient } from "@tanstack/react-query";

import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <span className="text-lg font-semibold">TripTap</span>
          <Link
            to="/"
            className="
              text-sm text-slate-600
              hover:underline
            "
            activeProps={{
              className: "text-sm font-medium text-slate-900 underline",
            }}
          >
            Home
          </Link>
          <Link
            to="/trips"
            className="
              text-sm text-slate-600
              hover:underline
            "
            activeProps={{
              className: "text-sm font-medium text-slate-900 underline",
            }}
          >
            Trips
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </div>
  );
}
