"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

function scheduledEmailsKey(itemType: "task" | "note", itemId: string) {
  return ["scheduled-emails", itemType, itemId];
}

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduledEmailsKey(itemType, itemId) }),
  });
}

export function useCancelScheduledEmail(itemType: "task" | "note", itemId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scheduledEmailsKey(itemType, itemId) }),
  });
}
