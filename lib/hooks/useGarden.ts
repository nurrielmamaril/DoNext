"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useListsQuery } from "@/lib/hooks/useLists";

export interface VinePlot {
  listId: string; // a real list id, or the literal "inbox" for uncategorized completions
  name: string;
  completedCount: number;
}

export function useCompletedTaskCountsByList() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["garden", "completed-counts"],
    queryFn: async () => {
      // Only the two columns needed for counting — deliberately lighter than
      // useTasksQuery, which pulls full rows plus a joined lists relation.
      const { data, error } = await supabase
        .from("tasks")
        .select("id, list_id")
        .eq("status", "completed")
        .is("deleted_at", null);
      if (error) throw error;

      const counts = new Map<string, number>();
      let total = 0;
      for (const row of data) {
        const key = row.list_id ?? "inbox";
        counts.set(key, (counts.get(key) ?? 0) + 1);
        total++;
      }
      return { counts, total };
    },
  });
}

export function useGardenData() {
  const { data: lists, isLoading: listsLoading } = useListsQuery();
  const { data: countsData, isLoading: countsLoading } = useCompletedTaskCountsByList();

  const plots: VinePlot[] = [];
  if (lists && countsData) {
    for (const list of lists) {
      plots.push({
        listId: list.id,
        name: list.name,
        completedCount: countsData.counts.get(list.id) ?? 0,
      });
    }
    // Uncategorized completions get their own vine, but only once there are
    // any — otherwise every account would show an empty "Inbox" stem.
    const inboxCount = countsData.counts.get("inbox") ?? 0;
    if (inboxCount > 0) {
      plots.push({ listId: "inbox", name: "Inbox", completedCount: inboxCount });
    }
  }

  return {
    plots,
    totalCompleted: countsData?.total ?? 0,
    isLoading: listsLoading || countsLoading,
  };
}
