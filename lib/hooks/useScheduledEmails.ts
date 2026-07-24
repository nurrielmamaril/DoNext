"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

function scheduledEmailsKey(itemType: "task" | "note", itemId: string) {
  return ["scheduled-emails", itemType, itemId];
}

const allScheduledEmailsKey = ["scheduled-emails", "all"];

export function useScheduledEmailsQuery(itemType: "task" | "note", itemId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: scheduledEmailsKey(itemType, itemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_emails")
        .select("*")
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .eq("status", "pending")
        .order("send_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllScheduledEmailsQuery() {
  const supabase = createClient();
  return useQuery({
    queryKey: allScheduledEmailsKey,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("scheduled_emails")
        .select("*")
        .eq("status", "pending")
        .order("send_at", { ascending: true });
      if (error) throw error;

      const taskIds = rows.filter((r) => r.item_type === "task").map((r) => r.item_id);
      const noteIds = rows.filter((r) => r.item_type === "note").map((r) => r.item_id);

      const [tasksResult, notesResult] = await Promise.all([
        taskIds.length
          ? supabase.from("tasks").select("id, title").in("id", taskIds)
          : Promise.resolve({ data: [] as { id: string; title: string }[] }),
        noteIds.length
          ? supabase.from("notes").select("id, title").in("id", noteIds)
          : Promise.resolve({ data: [] as { id: string; title: string | null }[] }),
      ]);

      const titleMap = new Map<string, string>();
      tasksResult.data?.forEach((t) => titleMap.set(t.id, t.title));
      notesResult.data?.forEach((n) => titleMap.set(n.id, n.title || "Untitled note"));

      return rows.map((r) => ({
        ...r,
        itemTitle: titleMap.get(r.item_id) ?? "(deleted item)",
      }));
    },
  });
}

export function useCreateScheduledEmail(itemType: "task" | "note", itemId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipient_email,
      subject,
      send_at,
    }: {
      recipient_email: string;
      subject?: string;
      send_at: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("scheduled_emails")
        .insert({
          user_id: userData.user.id,
          item_type: itemType,
          item_id: itemId,
          recipient_email,
          subject: subject || null,
          send_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledEmailsKey(itemType, itemId) });
      queryClient.invalidateQueries({ queryKey: allScheduledEmailsKey });
    },
  });
}

export function useCancelScheduledEmail() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; item_type: "task" | "note"; item_id: string }) => {
      const { error } = await supabase.from("scheduled_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduledEmailsKey(variables.item_type, variables.item_id) });
      queryClient.invalidateQueries({ queryKey: allScheduledEmailsKey });
    },
  });
}

export function useUpdateScheduledEmail() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      recipient_email,
      subject,
      send_at,
    }: {
      id: string;
      item_type: "task" | "note";
      item_id: string;
      recipient_email: string;
      subject?: string;
      send_at: string;
    }) => {
      const { error } = await supabase
        .from("scheduled_emails")
        .update({ recipient_email, subject: subject || null, send_at })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduledEmailsKey(variables.item_type, variables.item_id) });
      queryClient.invalidateQueries({ queryKey: allScheduledEmailsKey });
    },
  });
}
