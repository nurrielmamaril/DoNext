"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useSendItemEmail() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async ({
      type,
      id,
      to,
      subject,
    }: {
      type: "task" | "note";
      id: string;
      to: string;
      subject?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-item-email", {
        body: { type, id, to, subject },
      });
      if (error) {
        let message = error.message;
        try {
          const context = (error as unknown as { context?: Response }).context;
          if (context) {
            const body = await context.json();
            if (body?.error) message = body.error;
          }
        } catch {
          // fall back to error.message
        }
        throw new Error(message);
      }
      return data;
    },
  });
}
