"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportTasksCSV } from "@/lib/hooks/useImportExport";
import {
  tasksToCSV,
  downloadFile,
  parseCSV,
  validateImportRow,
  type ImportRowResult,
} from "@/lib/utils/csv";
import { todayISO } from "@/lib/utils/dates";
import { ImportPreviewDialog } from "@/components/tasks/ImportPreviewDialog";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "tasks";
}

export function ListImportExport({ listId, listName }: { listId: string; listName: string }) {
  const exportCSV = useExportTasksCSV();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewRows, setPreviewRows] = useState<ImportRowResult[] | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleExport() {
    try {
      const rows = await exportCSV.mutateAsync(listId);
      const csv = tasksToCSV(rows);
      downloadFile(csv, `donext-${slugify(listName)}-${todayISO()}.csv`, "text/csv;charset=utf-8");
      toast.success(`Exported ${rows.length} tasks`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't export tasks");
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const rawRows = parseCSV(text);
      const validated = rawRows.map((row) => validateImportRow(row, []));
      setPreviewRows(validated);
      setPreviewFilename(file.name);
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that file");
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={handleExport}
        disabled={exportCSV.isPending}
        aria-label="Export tasks as CSV"
        title="Export tasks as CSV"
      >
        <Download className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Import tasks from CSV"
        title="Import tasks from CSV"
      >
        <Upload className="size-3.5" />
      </Button>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />

      {previewRows && (
        <ImportPreviewDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setPreviewRows(null);
          }}
          rows={previewRows}
          filename={previewFilename}
          targetListId={listId}
          targetListName={listName}
        />
      )}
    </div>
  );
}
