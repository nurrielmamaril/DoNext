"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendItemEmail } from "@/lib/hooks/useSendItemEmail";

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
  const sendEmail = useSendItemEmail();

  async function handleSend() {
    try {
      await sendEmail.mutateAsync({ type, id, to, subject: subject.trim() || undefined });
      toast.success(`${type === "task" ? "Task" : "Note"} sent to ${to}`);
      setTo("");
      setSubject("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send email");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setTo("");
          setSubject("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {type === "task" ? "task" : "note"} via email</DialogTitle>
          <DialogDescription>Sends the full details to the email address below.</DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSend} disabled={!to || sendEmail.isPending}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
