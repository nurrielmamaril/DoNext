import { ArrowDown, ArrowUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/types/database.types";

export const priorityConfig: Record<
  TaskPriority,
  { label: string; badge: string; icon: typeof ArrowDown; border: string }
> = {
  low: {
    label: "Low",
    badge: "bg-muted text-muted-foreground",
    icon: ArrowDown,
    border: "border-l-border",
  },
  high: {
    label: "High",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    icon: ArrowUp,
    border: "border-l-amber-500",
  },
  urgent: {
    label: "Urgent",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    icon: Flame,
    border: "border-l-red-500",
  },
};

export function priorityBorderClass(priority: TaskPriority): string {
  return priorityConfig[priority].border;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, badge, icon: Icon } = priorityConfig[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        badge
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
