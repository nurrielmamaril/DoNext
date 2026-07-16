"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Clock,
  Copy,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderInput,
  GripVertical,
  Repeat,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge, priorityBorderClass } from "@/components/tasks/PriorityBadge";
import { StatusBadge } from "@/components/tasks/StatusBadge";
import { SendEmailDialog } from "@/components/tasks/SendEmailDialog";
import { formatDueDate, formatDueTime, isOverdue } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";
import {
  useCompleteTask,
  useDeleteTask,
  useRestoreTask,
  useDuplicateTask,
  useUpdateTask,
} from "@/lib/hooks/useTasks";
import { useListsQuery } from "@/lib/hooks/useLists";
import { useSubtasksQuery } from "@/lib/hooks/useSubtasks";
import type { Database } from "@/lib/types/database.types";
import { describeRecurrence, type RecurrenceRule } from "@/lib/utils/recurrence";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"] & {
  lists?: { id: string; name: string; color: string | null } | null;
};

interface TaskItemProps {
  task: TaskRow;
  onEdit: () => void;
  showListBadge?: boolean;
  draggable?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function TaskItem({
  task,
  onEdit,
  showListBadge = true,
  draggable = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: TaskItemProps) {
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const duplicateTask = useDuplicateTask();
  const updateTask = useUpdateTask();
  const { data: lists } = useListsQuery();
  const { data: subtasks } = useSubtasksQuery(task.id);
  const [busy, setBusy] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const overdue = isOverdue(task.due_date, task.status);
  const isCompleted = task.status === "completed";
  const subtaskTotal = subtasks?.length ?? 0;
  const subtaskDone = subtasks?.filter((s) => s.is_complete).length ?? 0;

  async function handleToggle() {
    setBusy(true);
    try {
      await completeTask.mutateAsync({
        id: task.id,
        status: task.status,
        list_id: task.list_id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.due_date,
        due_time: task.due_time,
        is_recurring: task.is_recurring,
        recurrence_rule: task.recurrence_rule as unknown as RecurrenceRule | null,
      });
      if (!isCompleted && task.is_recurring) {
        toast.success("Completed — next occurrence created");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    await deleteTask.mutateAsync(task.id);
    toast("Task deleted", {
      action: {
        label: "Undo",
        onClick: () => restoreTask.mutate(task.id),
      },
    });
  }

  async function handleDuplicate() {
    await duplicateTask.mutateAsync({
      title: task.title,
      list_id: task.list_id,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      due_time: task.due_time,
      description: task.description,
    });
    toast.success("Task duplicated");
  }

  async function handleMove(listId: string | null) {
    await updateTask.mutateAsync({ id: task.id, list_id: listId });
    toast.success("Task moved");
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        "group flex items-start gap-3 border-b border-l-4 px-4 py-2.5 last:border-b-0 hover:bg-accent/30",
        priorityBorderClass(task.priority)
      )}
    >
      {selectionMode ? (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect?.()}
          className="mt-0.5"
          aria-label={selected ? "Deselect task" : "Select task"}
        />
      ) : (
        draggable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none self-start text-muted-foreground opacity-0 group-hover:opacity-100"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </button>
        )
      )}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        disabled={busy}
        className="mt-0.5"
        aria-label={isCompleted ? "Mark as not started" : "Mark as complete"}
      />
      <button
        className="min-w-0 flex-1 text-left"
        onClick={selectionMode ? () => onToggleSelect?.() : onEdit}
      >
        <p className={cn("truncate text-sm", isCompleted && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {task.is_recurring && task.recurrence_rule && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Repeat className="size-3 shrink-0" />
              {describeRecurrence(task.recurrence_rule as unknown as RecurrenceRule)}
            </span>
          )}
          {task.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                overdue ? "font-medium text-destructive" : "text-muted-foreground"
              )}
            >
              <Calendar className="size-3" />
              {formatDueDate(task.due_date)}
              {task.due_time && (
                <>
                  <Clock className="size-3" />
                  {formatDueTime(task.due_time)}
                </>
              )}
              {overdue && " (overdue)"}
            </span>
          )}
          {showListBadge && task.lists && (
            <span className="text-xs text-muted-foreground">· {task.lists.name}</span>
          )}
        </div>
      </button>
      {subtaskTotal > 0 && (
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium",
            subtaskDone === subtaskTotal
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-muted text-muted-foreground"
          )}
        >
          {subtaskDone}/{subtaskTotal}
        </span>
      )}
      {!selectionMode && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100"
                aria-label="Task actions"
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="size-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSendEmailOpen(true)}>
              <Mail className="size-3.5" /> Send via email
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="size-3.5" /> Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleMove(null)}>Inbox</DropdownMenuItem>
                {lists?.map((list) => (
                  <DropdownMenuItem key={list.id} onClick={() => handleMove(list.id)}>
                    {list.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <SendEmailDialog
        open={sendEmailOpen}
        onOpenChange={setSendEmailOpen}
        type="task"
        id={task.id}
        defaultSubject={`Task: ${task.title}`}
      />
    </div>
  );
}
