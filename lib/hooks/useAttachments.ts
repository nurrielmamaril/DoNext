"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

type AttachmentParent = { taskId: string } | { noteId: string };

function parentColumn(parent: AttachmentParent) {
  return "taskId" in parent
    ? { column: "task_id" as const, value: parent.taskId }
    : { column: "note_id" as const, value: parent.noteId };
}

function attachmentsKey(parent: AttachmentParent) {
  const { column, value } = parentColumn(parent);
  return ["attachments", column, value];
}

export function useAttachmentsQuery(parent: AttachmentParent) {
  const supabase = createClient();
  const { column, value } = parentColumn(parent);
  return useQuery({
    queryKey: attachmentsKey(parent),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq(column, value)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadAttachment(parent: AttachmentParent) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { column, value } = parentColumn(parent);
  return useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new Error("File must be under 25MB");
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      const path = `${userData.user.id}/${value}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);

      const base = {
        user_id: userData.user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type || null,
        file_size: file.size,
      };

      const { error: insertError } = await supabase
        .from("attachments")
        .insert(column === "task_id" ? { ...base, task_id: value } : { ...base, note_id: value });
      if (insertError) throw insertError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentsKey(parent) }),
  });
}

export function useDeleteAttachment(parent: AttachmentParent) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attachments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attachmentsKey(parent) }),
  });
}
