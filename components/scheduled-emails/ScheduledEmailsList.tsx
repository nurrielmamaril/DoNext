"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAllScheduledEmailsQuery, useCancelScheduledEmail } from "@/lib/hooks/useScheduledEmails";
import { EditScheduledEmailDialog, type EditableScheduledEmail } from "@/components/scheduled-emails/EditScheduledEmailDialog";

export function ScheduledEmailsList() {
  const { data: scheduledEmails, isLoading } = useAllScheduledEmailsQuery();
  const cancelScheduled = useCancelScheduledEmail();

  const [editing, setEditing] = useState<EditableScheduledEmail | null>(null);
  const [cancelling, setCancelling] = useState<EditableScheduledEmail | null>(null);

  async function confirmCancel() {
    if (!cancelling) return;
    try {
      await cancelScheduled.mutateAsync({
        id: cancelling.id,
        item_type: cancelling.item_type,
        item_id: cancelling.item_id,
      });
      toast.success("Scheduled email cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel");
    } finally {
      setCancelling(null);
    }
  }

  if (isLoading) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!scheduledEmails || scheduledEmails.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Nothing scheduled right now.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {scheduledEmails.map((row) => (
        <div
          key={row.id}
          className="group flex items-center gap-3 rounded-md border px-3 py-2.5"
        >
          <Badge variant="outline" className="shrink-0 capitalize">
            {row.item_type}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{row.itemTitle}</p>
            <p className="truncate text-xs text-muted-foreground">
              to {row.recipient_email}
              {row.subject ? ` · "${row.subject}"` : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {format(new Date(row.send_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
          <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Edit scheduled email"
              onClick={() => setEditing(row)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Cancel scheduled email"
              onClick={() => setCancelling(row)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <EditScheduledEmailDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        scheduledEmail={editing}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel scheduled email?"
        description={`This email to ${cancelling?.recipient_email} will not be sent.`}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
