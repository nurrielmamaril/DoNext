"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ListInput } from "@/lib/validations/list.schema";

const LISTS_KEY = ["lists"];

export function useListsQuery() {
  const supabase = createClient();
  return useQuery({
    queryKey: LISTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateList() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ListInput & { position: number }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("lists")
        .insert({ ...input, user_id: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });
}

export function useUpdateList() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ListInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("lists")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function useUploadListLogo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, file }: { listId: string; file: File }) => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file");
      }
      if (file.size > MAX_LOGO_BYTES) {
        throw new Error("Image must be under 5MB");
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      const ext = file.name.split(".").pop() ?? "png";
      const path = `${userData.user.id}/${listId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("category-logos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("category-logos").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("lists")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", listId);
      if (updateError) throw updateError;

      return urlData.publicUrl;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });
}

export function useDeleteList() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useReorderLists() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      await Promise.all(
        ordered.map(({ id, position }) =>
          supabase.from("lists").update({ position }).eq("id", id)
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY }),
  });
}
