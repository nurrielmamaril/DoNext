"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ReminderMethod } from "@/lib/types/database.types";

function remindersKey(taskId: string) {
  return ["reminders", taskId];
}

export type SnoozeOption = "10m" | "30m" | "1h" | "tomorrow";

export function snoozeToDate(option: SnoozeOption): Date {
  const now = new Date();
  switch (option) {
    case "10m":
      return new Date(now.getTime() + 10 * 60_000);
    case "30m":
      return new Date(now.getTime() + 30 * 60_000);
    case "1h":
      return new Date(now.getTime() + 60 * 60_000);
    case "tomorrow": {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }
  }
}

export function useRemindersQuery(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: remindersKey(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("task_id", taskId)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReminder(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      remind_at,
      method = "email",
    }: {
      remind_at: string;
      method?: ReminderMethod;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("reminders")
        .insert({ task_id: taskId, user_id: userData.user.id, remind_at, method })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey(taskId) }),
  });
}

export function useDeleteReminder(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey(taskId) }),
  });
}

export function useSnoozeReminder(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, option }: { id: string; option: SnoozeOption }) => {
      const { error } = await supabase
        .from("reminders")
        .update({ status: "snoozed", snoozed_until: snoozeToDate(option).toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey(taskId) }),
  });
}

export function useDismissReminder(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: remindersKey(taskId) }),
  });
}
