"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskItem } from "@/components/tasks/TaskItem";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskEditorDialog, type EditableTask } from "@/components/tasks/TaskEditorDialog";
import {
  useTasksQuery,
  useReorderTasks,
  useBulkDeleteTasks,
  useBulkRestoreTasks,
  useBulkSetTaskStatus,
  type TaskFilter,
  type StatusFilter,
} from "@/lib/hooks/useTasks";
import type { Database } from "@/lib/types/database.types";
import type { RecurrenceRule } from "@/lib/utils/recurrence";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"] & {
  lists?: { id: string; name: string; color: string | null } | null;
};

type SortKey = "position" | "due_date" | "priority" | "status" | "created_at";

const priorityRank: Record<string, number> = { urgent: 0, high: 1, low: 2 };
const statusRank: Record<string, number> = {
  not_started: 0,
  in_progress: 1,
  waiting: 2,
  completed: 3,
};

function sortTasks(tasks: TaskRow[], sortKey: SortKey): TaskRow[] {
  const copy = [...tasks];
  switch (sortKey) {
    case "due_date":
      return copy.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    case "priority":
      return copy.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    case "status":
      return copy.sort((a, b) => statusRank[a.status] - statusRank[b.status]);
    case "created_at":
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    default:
      return copy;
  }
}

interface TaskListProps {
  title: string;
  filter: TaskFilter;
  emptyMessage: string;
  showListBadge?: boolean;
  allowQuickAdd?: boolean;
  defaultListId?: string | null;
  fullWidth?: boolean;
}

export function TaskList({
  title,
  filter,
  emptyMessage,
  showListBadge = true,
  allowQuickAdd = true,
  defaultListId = null,
  fullWidth = false,
}: TaskListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editingTask, setEditingTask] = useState<EditableTask | null | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const reorderTasks = useReorderTasks();
  const bulkDeleteTasks = useBulkDeleteTasks();
  const bulkRestoreTasks = useBulkRestoreTasks();
  const bulkSetTaskStatus = useBulkSetTaskStatus();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setSelectedIds(new Set());
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  }

  const showStatusFilter = Boolean(filter.listId);
  const effectiveFilter = showStatusFilter ? { ...filter, statusFilter, search } : filter;
  const { data: tasks, isLoading } = useTasksQuery(effectiveFilter);

  const sorted = useMemo(() => sortTasks((tasks as TaskRow[]) ?? [], sortKey), [tasks, sortKey]);
  const draggable = sortKey === "position" && !selectionMode;
  const selectedTasks = useMemo(
    () => sorted.filter((t) => selectedIds.has(t.id)),
    [sorted, selectedIds]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((t) => t.id === active.id);
    const newIndex = sorted.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    reorderTasks.mutate(reordered.map((t, i) => ({ id: t.id, position: i })));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(sorted.map((t) => t.id)));
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkComplete(complete: boolean) {
    const ids = selectedTasks.map((t) => t.id);
    await bulkSetTaskStatus.mutateAsync({
      tasks: selectedTasks.map((t) => ({
        id: t.id,
        list_id: t.list_id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        due_date: t.due_date,
        due_time: t.due_time,
        is_recurring: t.is_recurring,
        recurrence_rule: t.recurrence_rule as unknown as RecurrenceRule | null,
      })),
      complete,
    });
    setSelectedIds(new Set());
    toast.success(`${ids.length} task${ids.length === 1 ? "" : "s"} ${complete ? "completed" : "reopened"}`);
  }

  async function handleBulkDelete() {
    const ids = selectedTasks.map((t) => t.id);
    await bulkDeleteTasks.mutateAsync(ids);
    setBulkDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    toast(`${ids.length} task${ids.length === 1 ? "" : "s"} deleted`, {
      action: {
        label: "Undo",
        onClick: () => bulkRestoreTasks.mutate(ids),
      },
    });
  }

  function openEdit(task: TaskRow) {
    setEditingTask({
      id: task.id,
      title: task.title,
      list_id: task.list_id,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      due_time: task.due_time,
      description: task.description,
      is_recurring: task.is_recurring,
      recurrence_rule: task.recurrence_rule as unknown as RecurrenceRule | null,
    });
    setDialogOpen(true);
  }

  return (
    <div className={fullWidth ? "w-full" : "mx-auto max-w-2xl"}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-6 pb-3">
        {selectionMode ? (
          <>
            <span className="text-sm font-medium">{selectedTasks.length} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={selectAll}>
                Select all
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedTasks.length === 0}
                onClick={() => handleBulkComplete(true)}
              >
                Mark complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedTasks.length === 0}
                onClick={() => handleBulkComplete(false)}
              >
                Mark incomplete
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedTasks.length === 0}
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={exitSelectionMode}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl">{title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {showStatusFilter && (
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search..."
                    className="h-7 w-40 pl-7 text-[0.8rem]"
                  />
                </div>
              )}
              {showStatusFilter && (
                <Select
                  items={{ active: "Active", completed: "Completed", all: "All" }}
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as StatusFilter);
                    setSelectedIds(new Set());
                  }}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select
                items={{
                  position: "Default order",
                  due_date: "Due date",
                  priority: "Priority",
                  status: "Status",
                  created_at: "Date created",
                }}
                value={sortKey}
                onValueChange={(v) => {
                  setSortKey(v as SortKey);
                  setSelectedIds(new Set());
                }}
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Default order</SelectItem>
                  <SelectItem value="due_date">Due date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="created_at">Date created</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setSelectionMode(true)}>
                Select
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        {allowQuickAdd && <QuickAddTask defaultListId={defaultListId} />}
        {isLoading && (
          <p className="px-4 py-6 text-sm text-muted-foreground">Loading tasks...</p>
        )}
        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <ClipboardList className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sorted.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {sorted.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                showListBadge={showListBadge}
                onEdit={() => openEdit(task)}
                draggable={draggable}
                selectionMode={selectionMode}
                selected={selectedIds.has(task.id)}
                onToggleSelect={() => toggleSelect(task.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <TaskEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        task={editingTask}
        defaultListId={defaultListId}
      />

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title={`Delete ${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"}?`}
        description="This can't be undone."
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
