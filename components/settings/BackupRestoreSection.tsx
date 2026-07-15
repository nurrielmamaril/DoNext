"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { DatabaseBackup, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExportBackup } from "@/lib/hooks/useImportExport";
import { downloadFile } from "@/lib/utils/csv";
import { validateBackupShape, type BackupV1 } from "@/lib/utils/backup";
import { todayISO } from "@/lib/utils/dates";
import { RestorePreviewDialog } from "@/components/settings/RestorePreviewDialog";

export function BackupRestoreSection() {
  const exportBackup = useExportBackup();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<BackupV1 | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleExport() {
    try {
      const data = await exportBackup.mutateAsync();
      downloadFile(JSON.stringify(data, null, 2), `donext-backup-${todayISO()}.json`, "application/json");
      toast.success("Backup downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create backup");
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!validateBackupShape(json)) {
        toast.error("This doesn't look like a DoNext backup file");
        return;
      }
      setBackup(json);
      setDialogOpen(true);
    } catch {
      toast.error("Couldn't read that file — is it a valid backup JSON?");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backup & Restore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Download a full backup of your lists, tasks, and notes, or restore from a previous backup.
          Restoring only ever adds data — nothing existing is deleted or changed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={exportBackup.isPending}>
            <DatabaseBackup className="size-4" /> Download Backup
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" /> Restore from Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </CardContent>

      {backup && (
        <RestorePreviewDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setBackup(null);
          }}
          backup={backup}
        />
      )}
    </Card>
  );
}
