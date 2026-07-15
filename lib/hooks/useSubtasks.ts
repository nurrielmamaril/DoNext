"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

function subtasksKey(taskId: string) {
  return ["subtasks", taskId];
}

export function useSubtasksQuery(taskId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: subtasksKey(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubtask(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, position }: { title: string; position: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id: taskId, user_id: userData.user.id, title, position })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtasksKey(taskId) }),
  });
}

export function useToggleSubtask(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_complete }: { id: string; is_complete: boolean }) => {
      const { error } = await supabase.from("subtasks").update({ is_complete }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtasksKey(taskId) }),
  });
}

export function useUpdateSubtaskTitle(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("subtasks").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtasksKey(taskId) }),
  });
}

export function useDeleteSubtask(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtasksKey(taskId) }),
  });
}

export function useReorderSubtasks(taskId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      await Promise.all(
        ordered.map(({ id, position }) =>
          supabase.from("subtasks").update({ position }).eq("id", id)
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtasksKey(taskId) }),
  });
}
