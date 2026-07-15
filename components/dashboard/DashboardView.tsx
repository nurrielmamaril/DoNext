"use client";

import { useMemo, useState } from "react";
import { Plus, AlertTriangle, CalendarDays, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasksQuery } from "@/lib/hooks/useTasks";
import { formatDueDate } from "@/lib/utils/dates";
import { todayISO } from "@/lib/utils/dates";
import { TaskEditorDialog, type EditableTask } from "@/components/tasks/TaskEditorDialog";
import { ListFormDialog } from "@/components/lists/ListFormDialog";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";
import type { RecurrenceRule } from "@/lib/utils/recurrence";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

function DashboardWidget({
  icon: Icon,
  title,
  count,
  tasks,
  emptyText,
  onTaskClick,
  colorClass,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  tasks: TaskRow[];
  emptyText: string;
  onTaskClick: (task: TaskRow) => void;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <span className="text-xs text-muted-foreground">{count}</span>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onTaskClick(task)}
                  className={cn(
                    "truncate text-left text-sm hover:underline underline-offset-2",
                    colorClass
                  )}
                >
                  {task.title}
                </button>
                {task.due_date && (
                  <span className={cn("shrink-0 text-xs", colorClass ?? "text-muted-foreground")}>
                    {formatDueDate(task.due_date)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const { data: tasks, isLoading } = useTasksQuery({ view: "all" });
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EditableTask | null | undefined>(undefined);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const groups = useMemo(() => {
    const today = todayISO();
    const all = (tasks as TaskRow[]) ?? [];
    return {
      overdue: all.filter((t) => t.due_date && t.due_date < today),
      dueToday: all.filter((t) => t.due_date === today),
      upcoming: all
        .filter((t) => t.due_date && t.due_date > today)
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")),
    };
  }, [tasks]);

  function handleTaskClick(task: TaskRow) {
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
    setEditDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between pb-6">
        <h2 className="font-heading text-xl">Dashboard</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setListDialogOpen(true)}>
            <Plus className="size-4" /> New list
          </Button>
          <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
            <Plus className="size-4" /> New task
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <DashboardWidget
            icon={AlertTriangle}
            title="Overdue"
            count={groups.overdue.length}
            tasks={groups.overdue}
            emptyText="Nothing overdue."
            onTaskClick={handleTaskClick}
            colorClass="text-red-600 dark:text-red-400"
          />
          <DashboardWidget
            icon={CalendarDays}
            title="Due today"
            count={groups.dueToday.length}
            tasks={groups.dueToday}
            emptyText="Nothing due today."
            onTaskClick={handleTaskClick}
            colorClass="text-amber-600 dark:text-amber-400"
          />
          <DashboardWidget
            icon={CalendarClock}
            title="Upcoming"
            count={groups.upcoming.length}
            tasks={groups.upcoming}
            emptyText="Nothing scheduled yet."
            onTaskClick={handleTaskClick}
          />
        </div>
      )}

      <TaskEditorDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
      <ListFormDialog open={listDialogOpen} onOpenChange={setListDialogOpen} />
      <TaskEditorDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        task={editingTask}
      />
    </div>
  );
}
