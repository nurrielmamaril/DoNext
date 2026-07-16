"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, Plus, Repeat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useRemindersQuery,
  useCreateReminder,
  useDeleteReminder,
  useSnoozeReminder,
  type SnoozeOption,
} from "@/lib/hooks/useReminders";
import { ReminderRecurrencePicker } from "@/components/tasks/ReminderRecurrencePicker";
import { describeReminderRecurrence, type ReminderRecurrenceRule } from "@/lib/utils/reminderRecurrence";

const statusStyles: Record<string, string> = {
  pending: "text-muted-foreground",
  sent: "text-green-600 dark:text-green-400",
  snoozed: "text-amber-600 dark:text-amber-400",
  dismissed: "text-muted-foreground line-through",
};

const snoozeLabels: Record<SnoozeOption, string> = {
  "10m": "10 minutes",
  "30m": "30 minutes",
  "1h": "1 hour",
  tomorrow: "Tomorrow",
};

export function ReminderList({ taskId }: { taskId: string }) {
  const { data: reminders } = useRemindersQuery(taskId);
  const createReminder = useCreateReminder(taskId);
  const deleteReminder = useDeleteReminder(taskId);
  const snoozeReminder = useSnoozeReminder(taskId);
  const [newDateTime, setNewDateTime] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState<ReminderRecurrenceRule | null>(null);

  async function handleAdd() {
    if (!newDateTime) return;
    try {
      await createReminder.mutateAsync({
        remind_at: new Date(newDateTime).toISOString(),
        method: "email",
        is_recurring: recurrenceRule !== null,
        recurrence_rule: recurrenceRule,
      });
      setNewDateTime("");
      setRecurrenceRule(null);
      toast.success("Reminder set");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't set reminder");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteReminder.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete reminder");
    }
  }

  async function handleSnooze(id: string, option: SnoozeOption) {
    try {
      await snoozeReminder.mutateAsync({ id, option });
      toast.success(`Snoozed for ${snoozeLabels[option].toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't snooze reminder");
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Reminders</span>

      {reminders && reminders.length > 0 && (
        <ul className="space-y-1">
          {reminders.map((reminder) => {
            const when =
              reminder.status === "snoozed" && reminder.snoozed_until
                ? reminder.snoozed_until
                : reminder.remind_at;
            return (
              <li
                key={reminder.id}
                className="group flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
              >
                <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-label="Email" />
                <span className="flex-1">
                  {format(new Date(when), "MMM d, yyyy 'at' h:mm a")}
                  {reminder.is_recurring && reminder.recurrence_rule && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Repeat className="size-3" />
                      {describeReminderRecurrence(reminder.recurrence_rule)}
                    </span>
                  )}
                </span>
                <span className={`text-xs capitalize ${statusStyles[reminder.status]}`}>
                  {reminder.status}
                </span>
                {reminder.status === "sent" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" />
                      }
                    >
                      Snooze
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(Object.keys(snoozeLabels) as SnoozeOption[]).map((option) => (
                        <DropdownMenuItem key={option} onClick={() => handleSnooze(reminder.id, option)}>
                          {snoozeLabels[option]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 opacity-0 group-hover:opacity-100"
                  aria-label="Delete reminder"
                  onClick={() => handleDelete(reminder.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
        <Input
          type="datetime-local"
          value={newDateTime}
          onChange={(e) => setNewDateTime(e.target.value)}
          className="flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAdd} disabled={!newDateTime}>
          Add
        </Button>
      </div>
      <div className="pl-6">
        <ReminderRecurrencePicker rule={recurrenceRule} onChange={setRecurrenceRule} />
      </div>
      <p className="pl-6 text-xs text-muted-foreground">Reminders are sent to your email.</p>
    </div>
  );
}
