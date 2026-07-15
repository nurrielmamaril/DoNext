"use client";

import { toast } from "sonner";
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
import { useRestoreBackup } from "@/lib/hooks/useImportExport";
import type { BackupV1 } from "@/lib/utils/backup";

interface RestorePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backup: BackupV1;
}

export function RestorePreviewDialog({ open, onOpenChange, backup }: RestorePreviewDialogProps) {
  const restoreBackup = useRestoreBackup();
  const subtaskCount = backup.tasks.reduce((sum, t) => sum + t.subtasks.length, 0);

  async function handleConfirm() {
    try {
      const result = await restoreBackup.mutateAsync(backup);
      toast.success(
        `Restored ${result.createdTasks} tasks, ${result.createdSubtasks} subtasks, ${result.createdNotes} notes` +
          (result.createdLists > 0 ? `, and ${result.createdLists} new lists` : "")
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore backup</DialogTitle>
          <DialogDescription>
            Backed up {new Date(backup.exportedAt).toLocaleString()}. This will add:
          </DialogDescription>
        </DialogHeader>

        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>
            {backup.lists.length} list{backup.lists.length === 1 ? "" : "s"}
          </li>
          <li>
            {backup.tasks.length} task{backup.tasks.length === 1 ? "" : "s"}
          </li>
          <li>
            {subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}
          </li>
          <li>
            {backup.notes.length} note{backup.notes.length === 1 ? "" : "s"}
          </li>
        </ul>

        <p className="text-sm text-muted-foreground">
          Nothing will be deleted or changed. Restoring the same backup twice will create duplicates.
        </p>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleConfirm} disabled={restoreBackup.isPending}>
            Confirm Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
