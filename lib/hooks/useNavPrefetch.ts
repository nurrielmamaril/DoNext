"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fetchTasks, tasksKey, type TaskFilter } from "@/lib/hooks/useTasks";
import { fetchNotes, notesKey } from "@/lib/hooks/useNotes";

// The exact filters each nav destination renders with. These must match the
// pages, because React Query caches per filter — a near-miss would fetch a
// second time and the page would still start empty.
const TASK_VIEWS: TaskFilter[] = [
  // /tasks — All Tasks, as its filter bar starts out
  { view: "all", search: "", listIds: [], priorities: [], overdueOnly: false },
  { view: "today" }, // /deadlines, top half
  { view: "upcoming" }, // /deadlines, bottom half
  { view: "completed" }, // /completed
];

/**
 * Warms the data behind the nav destinations.
 *
 * The pages themselves are instant — it's their contents that arrive a beat
 * later, and that gap is what shows up as a white flash when the drawer
 * slides away from a page that hasn't filled in yet. Fetching while the
 * drawer is open (the user spends a second or so reading it) means the page
 * they pick is already populated the moment it appears.
 *
 * `prefetchQuery` is a no-op for data that's already fresh, so calling this
 * every time the drawer opens costs nothing after the first.
 */
export function useNavPrefetch() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    const supabase = createClient();
    for (const filter of TASK_VIEWS) {
      void queryClient.prefetchQuery({
        queryKey: tasksKey(filter),
        queryFn: () => fetchTasks(supabase, filter),
        staleTime: 30_000,
      });
    }
    void queryClient.prefetchQuery({
      queryKey: notesKey(null),
      queryFn: () => fetchNotes(supabase, null),
      staleTime: 30_000,
    });
  }, [queryClient]);
}
