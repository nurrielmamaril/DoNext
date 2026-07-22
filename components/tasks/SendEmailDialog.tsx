"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSendItemEmail } from "@/lib/hooks/useSendItemEmail";
import {
  useScheduledEmailsQuery,
  useCreateScheduledEmail,
  useCancelScheduledEmail,
} from "@/lib/hooks/useScheduledEmails";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "task" | "note";
  id: string;
  defaultSubject: string;
}

export function SendEmailDialog({ open, onOpenChange, type, id, defaultSubject }: SendEmailDialogProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [scheduleFor, setScheduleFor] = useState("");
  const sendEmail = useSendItemEmail();
  const { data: pending } = useScheduledEmailsQuery(type, id);
  const createScheduled = useCreateScheduledEmail(type, id);
  const cancelScheduled = useCancelScheduledEmail(type, id);

  function resetForm() {
    setTo("");
    setSubject("");
    setScheduled(false);
    setScheduleFor("");
  }

  async function handleSend() {
    if (scheduled) {
      if (!scheduleFor) return;
      const sendAt = new Date(scheduleFor);
      if (sendAt.getTime() <= Date.now()) {
        toast.error("Pick a date/time in the future");
        return;
      }
      try {
        await createScheduled.mutateAsync({
          recipient_email: to,
          subject: subject.trim() || undefined,
          send_at: sendAt.toISOString(),
        });
        toast.success(`Scheduled for ${format(sendAt, "MMM d, yyyy 'at' h:mm a")}`);
        resetForm();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't schedule email");
      }
      return;
    }

    try {
      await sendEmail.mutateAsync({ type, id, to, subject: subject.trim() || undefined });
      toast.success(`${type === "task" ? "Task" : "Note"} sent to ${to}`);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send email");
    }
  }

  async function handleCancel(scheduledId: string) {
    try {
      await cancelScheduled.mutateAsync(scheduledId);
      toast.success("Scheduled email cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel");
    }
  }

  const isPending = sendEmail.isPending || createScheduled.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {type === "task" ? "task" : "note"} via email</DialogTitle>
          <DialogDescription>Sends the full details to the email address below.</DialogDescription>
        </DialogHeader>

        {pending && pending.length > 0 && (
          <div className="space-y-1">
            <Label>Scheduled</Label>
            <ul className="space-y-1">
              {pending.map((row) => (
                <li
                  key={row.id}
                  className="group flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                >
                  <span className="flex-1 truncate">{row.recipient_email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(row.send_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover:opacity-100"
                    aria-label="Cancel scheduled email"
                    onClick={() => handleCancel(row.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="send-email-to">Recipient email</Label>
          <Input
            id="send-email-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="someone@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="send-email-subject">Subject (optional)</Label>
          <Input
            id="send-email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={defaultSubject}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="send-email-scheduled"
              checked={scheduled}
              onCheckedChange={() => setScheduled((v) => !v)}
            />
            <Label htmlFor="send-email-scheduled">Schedule for later</Label>
          </div>
          {scheduled && (
            <Input
              type="datetime-local"
              value={scheduleFor}
              onChange={(e) => setScheduleFor(e.target.value)}
            />
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSend} disabled={!to || (scheduled && !scheduleFor) || isPending}>
            {scheduled ? "Schedule" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
