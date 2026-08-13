import type { NavDestination } from "@/lib/nav";

import { useMemo, useState } from "react";

import { Link, createFileRoute } from "@tanstack/react-router";

import { AttentionCard } from "@/components/AttentionCard";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { allNavSections } from "@/lib/nav";
import { filterNavSections } from "@/lib/nav-search";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function TileCard({
  tile,
}: { tile: NavDestination }) {
  return (
    <Link
      to={tile.to}
      search={tile.search}
      className="
        group flex flex-col gap-2 rounded-xl border bg-card p-4
        text-card-foreground shadow-sm transition-colors
        hover:border-primary/50 hover:bg-accent
      "
    >
      <div className="flex items-center gap-2">
        <span
          className="
            flex size-9 shrink-0 items-center justify-center rounded-lg
            bg-primary/10 text-primary
          "
        >
          <tile.icon className="size-5" />
        </span>
        <span
          className="
            font-semibold
            group-hover:text-primary
          "
        >{tile.title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{tile.description}</p>
    </Link>
  );
}

function HomePage() {
  usePageTitle("Build your sentence bank");
  const [search, setSearch] = useState("");

  const shown = useMemo(() => filterNavSections(allNavSections, search), [search]);

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        sentence-bank is a self-deployable app for building your personal bank of example
        sentences. Jump into any section below to get started.
      </p>

      <AttentionCard />

      <Input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search the app…"
        aria-label="Search homepage sections"
        className="max-w-sm"
      />

      {shown.length === 0
        ? (
          <p className="text-muted-foreground">
            Nothing matches “
            {search.trim()}
            ”.
          </p>
        )
        : null}

      {shown.map(({
        section, tiles,
      }) => (
        <section
          key={section.label}
          className="space-y-3"
        >
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold">{section.label}</h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          <div
            className="
              grid grid-cols-1 gap-3
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {tiles.map(tile => (
              <TileCard
                key={`${tile.title}-${tile.to}`}
                tile={tile}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
