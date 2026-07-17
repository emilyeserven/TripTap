import { createFileRoute, Link } from "@tanstack/react-router";

import { MigakuImportUpload } from "@/components/MigakuImportUpload";
import { Card } from "@/components/ui/card";
import { useMigakuImports } from "@/hooks/useMigakuImports";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/migaku-import/")({
  component: MigakuImportPage,
});

function MigakuImportPage() {
  usePageTitle("Migaku Import");
  const {
    data: imports, isLoading,
  } = useMigakuImports();

  const pending = (imports ?? []).filter(i => i.status === "parsed");

  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Bring cards from a Migaku/Anki
        {" "}
        <code>.apkg</code>
        {" "}
        export into your bank — sentences and vocab,
        with their audio and images. Drop a file below, then review what gets created before importing.
      </p>

      <p className="text-sm text-muted-foreground">
        No file yet? Migaku Memory has no built-in export, so generate one with the
        {" "}
        <a
          href="https://github.com/wa-ra-ki/Migaku-Exporter"
          target="_blank"
          rel="noreferrer"
          className="
            underline underline-offset-4
            hover:text-foreground
          "
        >
          Migaku Exporter userscript
        </a>
        {" "}
        (a Tampermonkey/Violentmonkey script that adds an “Export to Anki” button to
        {" "}
        <code>study.migaku.com</code>
        ). Use its legacy/uncompressed option — newer compressed
        {" "}
        <code>.apkg</code>
        {" "}
        files aren’t supported.
      </p>

      <MigakuImportUpload />

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}

      {pending.length > 0
        ? (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Awaiting review</h2>
            {pending.map(imp => (
              <Link
                key={imp.id}
                to="/migaku-import/$id"
                params={{
                  id: imp.id,
                }}
                className="block"
              >
                <Card
                  className="
                    flex items-center justify-between p-4 transition-colors
                    hover:bg-muted/50
                  "
                >
                  <span className="font-medium">{imp.filename}</span>
                  <span className="text-sm text-muted-foreground">{imp.candidateCount} cards</span>
                </Card>
              </Link>
            ))}
          </div>
        )
        : null}
    </section>
  );
}
