import { z } from "zod";

export const taskPriorities = ["low", "high", "urgent"] as const;
export const taskStatuses = ["not_started", "in_progress", "waiting", "completed"] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  list_id: z.string().uuid().nullable().optional(),
  priority: z.enum(taskPriorities),
  status: z.enum(taskStatuses),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;
