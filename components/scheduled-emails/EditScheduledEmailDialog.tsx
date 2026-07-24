"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateScheduledEmail } from "@/lib/hooks/useScheduledEmails";

export interface EditableScheduledEmail {
  id: string;
  item_type: "task" | "note";
  item_id: string;
  recipient_email: string;
  subject: string | null;
  send_at: string;
}

interface EditScheduledEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledEmail: EditableScheduledEmail | null;
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// scheduledEmail-dependent state is seeded once at mount via lazy initializers
// rather than synced through an effect — the form only mounts while a row is
// being edited (key={scheduledEmail.id} forces a fresh mount if the target
// row changes), the same pattern TaskEditorDialog already uses.
export function EditScheduledEmailDialog({ open, onOpenChange, scheduledEmail }: EditScheduledEmailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {scheduledEmail && (
          <EditScheduledEmailForm
            key={scheduledEmail.id}
            scheduledEmail={scheduledEmail}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditScheduledEmailForm({
  scheduledEmail,
  onClose,
}: {
  scheduledEmail: EditableScheduledEmail;
  onClose: () => void;
}) {
  const [to, setTo] = useState(scheduledEmail.recipient_email);
  const [subject, setSubject] = useState(scheduledEmail.subject ?? "");
  const [sendAt, setSendAt] = useState(toDatetimeLocal(scheduledEmail.send_at));
  const updateScheduled = useUpdateScheduledEmail();

  async function handleSave() {
    if (!sendAt) return;
    const sendAtDate = new Date(sendAt);
    if (sendAtDate.getTime() <= Date.now()) {
      toast.error("Pick a date/time in the future");
      return;
    }
    try {
      await updateScheduled.mutateAsync({
        id: scheduledEmail.id,
        item_type: scheduledEmail.item_type,
        item_id: scheduledEmail.item_id,
        recipient_email: to,
        subject: subject.trim() || undefined,
        send_at: sendAtDate.toISOString(),
      });
      toast.success("Scheduled email updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update scheduled email");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit scheduled email</DialogTitle>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="edit-scheduled-to">Recipient email</Label>
        <Input
          id="edit-scheduled-to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="someone@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-scheduled-subject">Subject (optional)</Label>
        <Input id="edit-scheduled-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-scheduled-send-at">Send at</Label>
        <Input
          id="edit-scheduled-send-at"
          type="datetime-local"
          value={sendAt}
          onChange={(e) => setSendAt(e.target.value)}
        />
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button onClick={handleSave} disabled={!to || !sendAt || updateScheduled.isPending}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
