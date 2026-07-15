import { Circle, CircleDot, Hourglass, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types/database.types";

const styles: Record<TaskStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  waiting: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const icons: Record<TaskStatus, typeof Circle> = {
  not_started: Circle,
  in_progress: CircleDot,
  waiting: Hourglass,
  completed: CheckCircle2,
};

export const statusLabels: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting: "Waiting",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      <Icon className="size-3" />
      {statusLabels[status]}
    </span>
  );
}
