import type { QuestionSheetGridRow } from "@sentence-bank/types";

import { useState } from "react";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { newSheetItemId } from "@/lib/question-sheet-parts";

/**
 * The "grid / table" editor of the question-sheet form: named columns and labelled rows, each with a
 * bulk paste-one-per-line box. The parent owns the columns/rows arrays; this component owns only the
 * bulk-paste inputs.
 */
export function QuestionGridEditor({
  columns,
  rows,
  onColumnsChange,
  onRowsChange,
}: {
  columns: string[];
  rows: QuestionSheetGridRow[];
  onColumnsChange: (columns: string[]) => void;
  onRowsChange: (rows: QuestionSheetGridRow[]) => void;
}) {
  const [bulkColumns, setBulkColumns] = useState("");
  const [bulkRows, setBulkRows] = useState("");

  /** Append column headers from a pasted list (one per line), dropping blanks. */
  function applyBulkColumns() {
    const lines = bulkColumns.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    onColumnsChange([...columns.filter(x => x.trim().length > 0), ...lines]);
    setBulkColumns("");
  }
  /** Append row labels from a pasted list (one per line), dropping blanks. */
  function applyBulkRows() {
    const lines = bulkRows.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    onRowsChange([...rows, ...lines.map(label => ({
      id: newSheetItemId("r"),
      label,
    }))]);
    setBulkRows("");
  }

  return (
    <div
      className="
        grid gap-6
        sm:grid-cols-2
      "
    >
      <div className="space-y-2">
        <Label>Columns</Label>
        <div className="space-y-1.5 rounded-md border border-dashed p-3">
          <Label
            htmlFor="qs-bulk-columns"
            className="text-xs text-muted-foreground"
          >
            Bulk add — one column header per line
          </Label>
          <Textarea
            id="qs-bulk-columns"
            value={bulkColumns}
            onChange={e => setBulkColumns(e.target.value)}
            placeholder={"dictionary\nます\nて\nない"}
            rows={3}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={applyBulkColumns}
          >
            <Plus className="size-4" />
            Add columns
          </Button>
        </div>
        {columns.map((col, index) => (
          <div
            key={index}
            className="flex items-center gap-2"
          >
            <Input
              value={col}
              onChange={e => onColumnsChange(columns.map((c, i) => (i === index ? e.target.value : c)))}
              placeholder={`Column ${index + 1}, e.g. ます-form`}
              aria-label={`Column ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              aria-label="Remove column"
              onClick={() => onColumnsChange(columns.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onColumnsChange([...columns, ""])}
        >
          <Plus className="size-4" />
          Add column
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Rows</Label>
        <div className="space-y-1.5 rounded-md border border-dashed p-3">
          <Label
            htmlFor="qs-bulk-rows"
            className="text-xs text-muted-foreground"
          >
            Bulk add — one row label per line
          </Label>
          <Textarea
            id="qs-bulk-rows"
            value={bulkRows}
            onChange={e => setBulkRows(e.target.value)}
            placeholder={"食べる\n飲む\n見る"}
            rows={3}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={applyBulkRows}
          >
            <Plus className="size-4" />
            Add rows
          </Button>
        </div>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="flex items-center gap-2"
          >
            <Input
              value={row.label}
              onChange={e => onRowsChange(rows.map(r => (r.id === row.id
                ? {
                  ...r,
                  label: e.target.value,
                }
                : r)))}
              placeholder={`Row ${index + 1}, e.g. 食べる`}
              aria-label={`Row ${index + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              aria-label="Remove row"
              onClick={() => onRowsChange(rows.filter(r => r.id !== row.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRowsChange([...rows, {
            id: newSheetItemId("r"),
            label: "",
          }])}
        >
          <Plus className="size-4" />
          Add row
        </Button>
      </div>
    </div>
  );
}
