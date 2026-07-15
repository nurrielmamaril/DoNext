"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TaskList } from "@/components/tasks/TaskList";
import {
  TaskSearchFilterBar,
  parseTaskSearchParams,
  buildTaskQueryString,
  type ParsedTaskFilters,
} from "@/components/tasks/TaskSearchFilterBar";

const EMPTY_FILTERS: ParsedTaskFilters = { search: "", listIds: [], priorities: [], overdueOnly: false };

export default function AllTasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<ParsedTaskFilters>(EMPTY_FILTERS);
  const hydratedRef = useRef(false);

  // Read filters from the URL only after mount (window isn't available
  // during SSR).
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      setFilters(parseTaskSearchParams(new URLSearchParams(window.location.search)));
    }
  }, []);

  function handleFiltersChange(next: ParsedTaskFilters) {
    setFilters(next);
    const qs = buildTaskQueryString(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <TaskSearchFilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      </div>
      <TaskList
        title="All Tasks"
        filter={{
          view: "all",
          search: filters.search,
          listIds: filters.listIds,
          priorities: filters.priorities,
          overdueOnly: filters.overdueOnly,
        }}
        emptyMessage="No tasks yet. Add your first one above."
      />
    </div>
  );
}
