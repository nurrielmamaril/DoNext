"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TaskInput } from "@/lib/validations/task.schema";
import type { TaskPriority, TaskStatus } from "@/lib/types/database.types";
import { todayISO } from "@/lib/utils/dates";
import { computeNextDueDate, type RecurrenceRule } from "@/lib/utils/recurrence";

interface RecurrenceFields {
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule | null;
}

export type TaskView = "inbox" | "today" | "upcoming" | "all" | "completed";
export type StatusFilter = "active" | "completed" | "all";

export interface TaskFilter {
  view?: TaskView;
  listId?: string;
  statusFilter?: StatusFilter;
  search?: string;
  listIds?: string[];
  priorities?: TaskPriority[];
  overdueOnly?: boolean;
}

function tasksKey(filter: TaskFilter) {
  return ["tasks", filter];
}

// PostgREST's .or() filter string uses commas as condition separators and
// treats %/_ as ILIKE wildcards — escape those before interpolating raw
// user input, or a search term can corrupt the filter or over-match.
function sanitizeIlikeTerm(term: string): string {
  return term.replace(/[\\%_,]/g, (ch) => `\\${ch}`);
}

export function useTasksQuery(filter: TaskFilter) {
  const supabase = createClient();
  return useQuery({
    queryKey: tasksKey(filter),
    queryFn: async () => {
      let query = supabase.from("tasks").select("*, lists(id, name, color)").is("deleted_at", null);
      const today = todayISO();

      if (filter.listId) {
        query = query.eq("list_id", filter.listId);
        if (filter.statusFilter === "active") {
          query = query.neq("status", "completed");
        } else if (filter.statusFilter === "completed") {
          query = query.eq("status", "completed");
        }
      } else if (filter.view === "inbox") {
        query = query.is("list_id", null).neq("status", "completed");
      } else if (filter.view === "today") {
        query = query.lte("due_date", today).neq("status", "completed");
      } else if (filter.view === "upcoming") {
        query = query.gt("due_date", today).neq("status", "completed");
      } else if (filter.view === "all") {
        query = query.neq("status", "completed");
      } else if (filter.view === "completed") {
        query = query.eq("status", "completed");
      }

      if (filter.search?.trim()) {
        const term = sanitizeIlikeTerm(filter.search.trim());
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }
      if (filter.listIds?.length) {
        query = query.in("list_id", filter.listIds);
      }
      if (filter.priorities?.length) {
        query = query.in("priority", filter.priorities);
      }
      if (filter.overdueOnly) {
        query = query.lt("due_date", today).neq("status", "completed");
      }

      const { data, error } = await query
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TaskInput> & RecurrenceFields & { title: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: input.title,
          list_id: input.list_id ?? null,
          priority: input.priority ?? "low",
          status: input.status ?? "not_started",
          due_date: input.due_date ?? null,
          due_time: input.due_time ?? null,
          description: input.description ?? null,
          is_recurring: input.is_recurring ?? false,
          recurrence_rule: input.recurrence_rule ?? null,
          user_id: userData.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<TaskInput> & RecurrenceFields & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// Toggles a task's completion. If the task recurs, also spins up the next
// occurrence so the series continues.
export function useCompleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: {
      id: string;
      status: TaskStatus;
      list_id: string | null;
      title: string;
      description: string | null;
      priority: TaskPriority;
      due_date: string | null;
      due_time: string | null;
      is_recurring: boolean;
      recurrence_rule: RecurrenceRule | null;
    }) => {
      const isCompleting = task.status !== "completed";
      const { error } = await supabase
        .from("tasks")
        .update({
          status: isCompleting ? "completed" : "not_started",
          completed_at: isCompleting ? new Date().toISOString() : null,
        })
        .eq("id", task.id);
      if (error) throw error;

      if (isCompleting && task.is_recurring && task.recurrence_rule && task.due_date) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const nextDueDate = computeNextDueDate(task.due_date, task.recurrence_rule);
          await supabase.from("tasks").insert({
            user_id: userData.user.id,
            list_id: task.list_id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: "not_started",
            due_date: nextDueDate,
            due_time: task.due_time,
            is_recurring: true,
            recurrence_rule: task.recurrence_rule,
            recurrence_parent_id: task.id,
          });
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useSetTaskStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useRestoreTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDuplicateTask() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: {
      title: string;
      list_id: string | null;
      priority: TaskPriority;
      status: TaskStatus;
      due_date: string | null;
      due_time: string | null;
      description: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, title: `${task.title} (copy)`, user_id: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useReorderTasks() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      await Promise.all(
        ordered.map(({ id, position }) =>
          supabase.from("tasks").update({ position }).eq("id", id)
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
