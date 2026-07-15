"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

function notesKey(listId: string | null) {
  return ["notes", listId ?? "general"];
}

export function useNotesQuery(listId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: notesKey(listId),
    queryFn: async () => {
      let query = supabase.from("notes").select("*");
      query = listId ? query.eq("list_id", listId) : query.is("list_id", null);
      const { data, error } = await query.order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateNote(listId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (position: number) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("notes")
        .insert({
          list_id: listId,
          user_id: userData.user.id,
          title: null,
          content: "",
          position,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(listId) }),
  });
}

export function useReorderNotes(listId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      await Promise.all(
        ordered.map(({ id, position }) =>
          supabase.from("notes").update({ position }).eq("id", id)
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(listId) }),
  });
}

export function useUpdateNote(listId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      color,
    }: {
      id: string;
      title?: string | null;
      content?: string;
      color?: string | null;
    }) => {
      const { error } = await supabase
        .from("notes")
        .update({ title, content, color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(listId) }),
  });
}

export function useDeleteNote(listId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(listId) }),
  });
}

export function useBulkDeleteNotes(listId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => supabase.from("notes").delete().eq("id", id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(listId) }),
  });
}
