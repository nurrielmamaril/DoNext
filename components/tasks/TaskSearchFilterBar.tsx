"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useListsQuery } from "@/lib/hooks/useLists";
import { priorityConfig } from "@/components/tasks/PriorityBadge";
import type { TaskPriority } from "@/lib/types/database.types";

export interface ParsedTaskFilters {
  search: string;
  listIds: string[];
  priorities: TaskPriority[];
  overdueOnly: boolean;
}

export function parseTaskSearchParams(params: URLSearchParams): ParsedTaskFilters {
  return {
    search: params.get("q") ?? "",
    listIds: params.get("lists")?.split(",").filter(Boolean) ?? [],
    priorities: (params.get("priorities")?.split(",").filter(Boolean) as TaskPriority[]) ?? [],
    overdueOnly: params.get("overdue") === "1",
  };
}

export function buildTaskQueryString(f: ParsedTaskFilters): string {
  const params = new URLSearchParams();
  if (f.search) params.set("q", f.search);
  if (f.listIds.length) params.set("lists", f.listIds.join(","));
  if (f.priorities.length) params.set("priorities", f.priorities.join(","));
  if (f.overdueOnly) params.set("overdue", "1");
  return params.toString();
}

const ALL_PRIORITIES: TaskPriority[] = ["low", "high", "urgent"];

interface TaskSearchFilterBarProps {
  filters: ParsedTaskFilters;
  onFiltersChange: (next: ParsedTaskFilters) => void;
}

export function TaskSearchFilterBar({ filters, onFiltersChange }: TaskSearchFilterBarProps) {
  const { data: lists } = useListsQuery();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const [searchInput, setSearchInput] = useState(filters.search);
  // Popovers use a portal, which doesn't resolve correctly when rendered
  // during the server-streamed Suspense pass this component sits in — defer
  // them to client-only rendering.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setMounted(true);
    }
  }, []);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
    }, 300);
  }

  function removeSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    onFiltersChange({ ...filters, search: "" });
  }

  function toggleListId(id: string) {
    const next = filters.listIds.includes(id)
      ? filters.listIds.filter((x) => x !== id)
      : [...filters.listIds, id];
    onFiltersChange({ ...filters, listIds: next });
  }

  function togglePriority(p: TaskPriority) {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    onFiltersChange({ ...filters, priorities: next });
  }

  function toggleOverdue() {
    onFiltersChange({ ...filters, overdueOnly: !filters.overdueOnly });
  }

  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    onFiltersChange({ search: "", listIds: [], priorities: [], overdueOnly: false });
  }

  const hasActiveFilters =
    searchInput.length > 0 ||
    filters.listIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.overdueOnly;

  const listNameById = new Map((lists ?? []).map((l) => [l.id, l.name]));

  return (
    <div className="flex flex-col gap-2 px-4 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tasks..."
            className="pl-7"
          />
        </div>

        {mounted ? (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              Lists{filters.listIds.length > 0 ? ` (${filters.listIds.length})` : ""}
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {(lists ?? []).length === 0 && (
                  <p className="px-1 py-1 text-xs text-muted-foreground">No lists yet</p>
                )}
                {(lists ?? []).map((list) => (
                  <label
                    key={list.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={filters.listIds.includes(list.id)}
                      onCheckedChange={() => toggleListId(list.id)}
                    />
                    {list.name}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Lists{filters.listIds.length > 0 ? ` (${filters.listIds.length})` : ""}
          </Button>
        )}

        {mounted ? (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              Priority{filters.priorities.length > 0 ? ` (${filters.priorities.length})` : ""}
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="flex flex-col gap-1">
                {ALL_PRIORITIES.map((p) => (
                  <label
                    key={p}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={filters.priorities.includes(p)}
                      onCheckedChange={() => togglePriority(p)}
                    />
                    {priorityConfig[p].label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Priority{filters.priorities.length > 0 ? ` (${filters.priorities.length})` : ""}
          </Button>
        )}

        <Button
          type="button"
          variant={filters.overdueOnly ? "default" : "outline"}
          size="sm"
          onClick={toggleOverdue}
        >
          Overdue
        </Button>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {searchInput && (
            <Badge variant="outline" className="gap-1">
              &quot;{searchInput}&quot;
              <button type="button" onClick={removeSearch} aria-label="Clear search">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.listIds.map((id) => (
            <Badge key={id} variant="outline" className="gap-1">
              {listNameById.get(id) ?? "List"}
              <button type="button" onClick={() => toggleListId(id)} aria-label="Remove filter">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {filters.priorities.map((p) => (
            <Badge key={p} variant="outline" className="gap-1">
              {priorityConfig[p].label}
              <button type="button" onClick={() => togglePriority(p)} aria-label="Remove filter">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {filters.overdueOnly && (
            <Badge variant="outline" className="gap-1">
              Overdue
              <button type="button" onClick={toggleOverdue} aria-label="Remove filter">
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
