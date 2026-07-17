import { useRef, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUploadMigakuImport } from "@/hooks/useMigakuImports";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop / file-picker for a Migaku `.apkg`. On a successful parse it navigates to the review
 * page for the new staged import.
 */
export function MigakuImportUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const navigate = useNavigate();
  const upload = useUploadMigakuImport();

  function handleFile(file: File | undefined) {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: detail =>
        navigate({
          to: "/migaku-import/$id",
          params: {
            id: detail.id,
          },
        }),
    });
  }

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      className={cn(
        `
          flex flex-col items-center justify-center gap-3 rounded-lg border-2
          border-dashed p-10 text-center transition-colors
        `,
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
      )}
    >
      <Upload className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">
          Drop a Migaku
          <code>.apkg</code>
          {" "}
          here
        </p>
        <p className="text-sm text-muted-foreground">
          Export your deck with the Migaku/Anki exporter, then drop the file to review its cards.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".apkg,.zip"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? "Reading…" : "Choose a file"}
      </Button>
    </div>
  );
}
