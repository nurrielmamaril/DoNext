import type { TaskPriority, TaskStatus } from "@/lib/types/database.types";

export interface BackupSubtask {
  title: string;
  is_complete: boolean;
  position: number;
}

export interface BackupTask {
  title: string;
  description: string | null;
  list: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  subtasks: BackupSubtask[];
}

export interface BackupNote {
  list: string | null;
  title: string | null;
  content: string;
  color: string | null;
  position: number;
}

export interface BackupList {
  name: string;
  color: string | null;
  position: number;
}

export interface BackupV1 {
  version: 1;
  app: "donext";
  exportedAt: string;
  lists: BackupList[];
  tasks: BackupTask[];
  notes: BackupNote[];
}

export function validateBackupShape(json: unknown): json is BackupV1 {
  if (typeof json !== "object" || json === null) return false;
  const obj = json as Record<string, unknown>;
  return (
    obj.version === 1 &&
    obj.app === "donext" &&
    Array.isArray(obj.lists) &&
    Array.isArray(obj.tasks) &&
    Array.isArray(obj.notes)
  );
}
