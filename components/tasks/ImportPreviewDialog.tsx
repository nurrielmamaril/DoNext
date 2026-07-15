"use client";

import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useImportTasks } from "@/lib/hooks/useImportExport";
import { priorityConfig } from "@/components/tasks/PriorityBadge";
import { statusLabels } from "@/components/tasks/StatusBadge";
import type { ImportRowResult, ImportRowStatus } from "@/lib/utils/csv";

const statusIcon: Record<ImportRowStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const statusColor: Record<ImportRowStatus, string> = {
  ok: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
};

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ImportRowResult[];
  filename: string;
  /** When set, rows import into this list and the CSV's own "list" column is ignored. */
  targetListId?: string;
  targetListName?: string;
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  rows,
  filename,
  targetListId,
  targetListName,
}: ImportPreviewDialogProps) {
  const importTasks = useImportTasks();
  const validCount = rows.filter((r) => r.rowStatus !== "error").length;
  const errorCount = rows.length - validCount;

  async function handleConfirm() {
    try {
      const result = await importTasks.mutateAsync({ rows, targetListId });
      toast.success(
        `Imported ${result.createdTasks} task${result.createdTasks === 1 ? "" : "s"}` +
          (result.createdLists > 0
            ? ` and created ${result.createdLists} new list${result.createdLists === 1 ? "" : "s"}`
            : "")
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Import {rows.length} row{rows.length === 1 ? "" : "s"} from {filename}
          </DialogTitle>
          <DialogDescription>
            {targetListName
              ? `Review the parsed rows below, then confirm to add these tasks to ${targetListName}.`
              : "Review the parsed rows below, then confirm to create these tasks."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-medium">Title</th>
                {!targetListId && <th className="px-2 py-1.5 font-medium">List</th>}
                <th className="px-2 py-1.5 font-medium">Priority</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium">Due</th>
                <th className="px-2 py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const Icon = statusIcon[row.rowStatus];
                return (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <Icon className={`size-3.5 shrink-0 ${statusColor[row.rowStatus]}`} />
                        {row.title || <span className="text-muted-foreground italic">(missing)</span>}
                      </span>
                    </td>
                    {!targetListId && (
                      <td className="px-2 py-1.5">
                        {row.listName ?? <span className="text-muted-foreground">Inbox</span>}
                        {row.willCreateList && <span className="text-muted-foreground"> (new)</span>}
                      </td>
                    )}
                    <td className="px-2 py-1.5">{priorityConfig[row.priority].label}</td>
                    <td className="px-2 py-1.5">{statusLabels[row.status]}</td>
                    <td className="px-2 py-1.5">{row.due_date ?? "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{row.messages.join("; ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          {validCount} task{validCount === 1 ? "" : "s"} will be created
          {targetListName && ` in ${targetListName}`}
          {errorCount > 0 && ` · ${errorCount} row${errorCount === 1 ? "" : "s"} skipped due to errors`}
        </p>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleConfirm} disabled={validCount === 0 || importTasks.isPending}>
            Confirm Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
