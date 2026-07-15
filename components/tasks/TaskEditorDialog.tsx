"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskSchema, type TaskInput } from "@/lib/validations/task.schema";
import { useCreateTask, useUpdateTask } from "@/lib/hooks/useTasks";
import { statusLabels } from "@/components/tasks/StatusBadge";
import { priorityConfig } from "@/components/tasks/PriorityBadge";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import { CommentThread } from "@/components/tasks/CommentThread";
import { ReminderList } from "@/components/tasks/ReminderList";
import { RecurrencePicker } from "@/components/tasks/RecurrencePicker";
import { useUploadAttachment } from "@/lib/hooks/useAttachments";
import { extractImageFromClipboard } from "@/lib/utils/clipboard";
import type { RecurrenceRule } from "@/lib/utils/recurrence";

export interface EditableTask extends TaskInput {
  id?: string;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule | null;
}

interface TaskEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: EditableTask | null;
  defaultListId?: string | null;
}

const priorityLabels: Record<string, string> = {
  low: priorityConfig.low.label,
  high: priorityConfig.high.label,
  urgent: priorityConfig.urgent.label,
};

// Rendered only while the dialog is open, so every field (including
// recurrence, which lives outside react-hook-form) starts fresh from
// `task` on each mount instead of needing an effect-driven reset.
function TaskEditorForm({
  task,
  defaultListId,
  onOpenChange,
}: {
  task?: EditableTask | null;
  defaultListId?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const uploadAttachment = useUploadAttachment({ taskId: task?.id ?? "" });
  const isEditing = Boolean(task?.id);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    task?.recurrence_rule ?? null
  );

  async function handlePaste(e: React.ClipboardEvent) {
    if (!task?.id) return;
    const file = extractImageFromClipboard(e);
    if (!file) return;
    e.preventDefault();
    try {
      await uploadAttachment.mutateAsync(file);
      toast.success("Image pasted as attachment");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't paste image");
    }
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      priority: task?.priority ?? "low",
      status: task?.status ?? "not_started",
      due_date: task?.due_date ?? null,
      due_time: task?.due_time ?? null,
      description: task?.description ?? "",
    },
  });

  async function onSubmit(values: TaskInput) {
    // The list a task belongs to is set at creation time (or changed via
    // "Move to" on the task's menu) rather than in this form.
    const list_id = isEditing ? (task?.list_id ?? null) : (defaultListId ?? null);
    const recurrenceFields = {
      is_recurring: recurrenceRule !== null,
      recurrence_rule: recurrenceRule,
    };
    try {
      if (isEditing && task?.id) {
        await updateTask.mutateAsync({ id: task.id, ...values, list_id, ...recurrenceFields });
        toast.success("Task updated");
      } else {
        await createTask.mutateAsync({ ...values, list_id, ...recurrenceFields });
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} onPaste={handlePaste} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" autoFocus {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select items={priorityLabels} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select items={statusLabels} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" type="date" {...register("due_date")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="due_time">Due time (optional)</Label>
          <Input id="due_time" type="time" className="w-full" {...register("due_time")} />
        </div>
      </div>

      <RecurrencePicker rule={recurrenceRule} onChange={setRecurrenceRule} />

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>

      {isEditing && task?.id && (
        <>
          <Separator />
          <div className="space-y-1">
            <AttachmentList taskId={task.id} />
            <p className="text-xs text-muted-foreground">
              Tip: paste an image (Ctrl/Cmd+V) anywhere in this form to attach it.
            </p>
          </div>
          <Separator />
          <SubtaskList taskId={task.id} />
          <Separator />
          <ReminderList taskId={task.id} />
          <Separator />
          <CommentThread taskId={task.id} />
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? "Save" : "Create task"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TaskEditorDialog({
  open,
  onOpenChange,
  task,
  defaultListId,
}: TaskEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task?.id ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        {open && (
          <TaskEditorForm task={task} defaultListId={defaultListId} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  );
}
